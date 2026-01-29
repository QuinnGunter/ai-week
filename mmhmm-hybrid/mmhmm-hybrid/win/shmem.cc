#include <windows.h>

#include <mutex>
#include <vector>

#include "shmem.h"

namespace mmhmm {

	const wchar_t rwSyncShmemDescName[] = L"MmhmmSingletonSharedArea";
	const wchar_t ringDescShmemDescName[] = L"MmhmmSingletonRingDescriptors";
	const wchar_t ringDescShmemName[] = L"MmhmmSingletonRing";

	struct OSShMem
	{
		HANDLE hMapFile;
		LPVOID pBuf;
	};

	Shmem::Shmem() {}

	bool Shmem::Create(const wchar_t* szName, int sz)
	{
		OSShMem* me = (OSShMem*)&mOSData;
		memSize = 0;
		me->hMapFile = CreateFileMapping(
			INVALID_HANDLE_VALUE,    // use paging file
			NULL,                    // default security
			PAGE_READWRITE,          // read/write access
			0,                       // maximum object size (high-order DWORD)
			sz,                // maximum object size (low-order DWORD)
			szName);                 // name of mapping object

		if (me->hMapFile == NULL)
		{
			//_tprintf(TEXT("Could not create file mapping object (%d).\n"),
			//	GetLastError());
			return false;
		}
		me->pBuf = MapViewOfFile(me->hMapFile,   // handle to map object
			FILE_MAP_ALL_ACCESS, // read/write permission
			0,
			0,
			sz);

		if (me->pBuf == NULL)
		{
			//_tprintf(TEXT("Could not map view of file (%d).\n"),
			//	GetLastError());

			CloseHandle(me->hMapFile);

			return false;
		}
		//initialize available size
		memSize = sz;
		return true;
	}

	bool Shmem::Open(const wchar_t* szName, int sz)
	{
		OSShMem* me = (OSShMem*)&mOSData;
		memSize = 0;
		me->hMapFile = OpenFileMapping(
			FILE_MAP_WRITE | FILE_MAP_READ,   // read/write access FILE_MAP_ALL_ACCESS
			FALSE,                 // do not inherit the name
			szName);               // name of mapping object

		if (me->hMapFile == NULL)
		{
			//_tprintf(TEXT("Could not open file mapping object (%d).\n"),
			//	GetLastError());
			return false;
		}

		me->pBuf = (LPTSTR)MapViewOfFile(me->hMapFile, // handle to map object
			FILE_MAP_ALL_ACCESS,  // read/write permission
			0,
			0,
			sz);

		if (me->pBuf == NULL)
		{
			//_tprintf(TEXT("Could not map view of file (%d).\n"),
			//	GetLastError());

			CloseHandle(me->hMapFile);

			return false;
		}
		//initialize available size
		memSize = sz;
		return true;
	}

	void Shmem::Delete()
	{
		OSShMem* me = (OSShMem*)&mOSData;
		if (me->pBuf != NULL)
		{
			UnmapViewOfFile(me->pBuf);
			me->pBuf = NULL;
		}

		if (me->hMapFile != NULL)
		{
			CloseHandle(me->hMapFile);
			me->hMapFile = NULL;
		}
	}
	int Shmem::Write(const void* inBuf, int sz, int offset)
	{
		OSShMem* me = (OSShMem*)&mOSData;

		//truncate
		if (sz + offset > memSize)
			sz = memSize - offset;

		CopyMemory((void*)((char*)me->pBuf + offset), inBuf, sz);
		return sz;
	}

	int Shmem::Read(void* outBuf, int sz, int offset)
	{
		OSShMem* me = (OSShMem*)&mOSData;

		//truncate
		if (sz + offset > memSize)
			sz = memSize - offset;

		CopyMemory(outBuf, (void*)((char*)me->pBuf + offset), sz);
		return sz;
	}

	void* Shmem::Get()
	{
		OSShMem* me = (OSShMem*)&mOSData;
		return me->pBuf;
	}

	//-------------------------

	struct RingOS
	{
		HANDLE hEvent;
	};


	const wchar_t Ring::evName[] = L"MmhmmSingletonEvent";

	Ring::Ring() {}

	bool Ring::Create(int ringSz, int ringBufSz)
	{
		RingOS* me = (RingOS*)&mOSData;

		if (!rwSync.Create(rwSyncShmemDescName, sizeof(RWSync)))
			//unable to create RW Sync area
			return false;

		if (!ringDesc.Create(ringDescShmemDescName, ringSz * sizeof(RingDesc)))
		{
			//unable to create descriptos shmem
			rwSync.Delete();
			return false;
		}

		//set cur, next, and curRead to 0
		((RWSync*)rwSync.Get())->cur = ((RWSync*)rwSync.Get())->next = 0;

		//initialize descriptors, set buf avail to 0, since no buffers are available for READING
		//RingDesc* first = (RingDesc*)ringDesc.Get();
		//for (int idx = 0; idx < ringSz; ++idx)
		//{
		//	RingDesc* desc = first + idx;
		//	desc->flags.bufAvail = 0;
		//}

		if (!ring.Create(ringDescShmemName, ringSz * ringBufSz))//creating in global namespace (with "Global\\" prefix) produces access denied
		{
			//unable to create ring
			rwSync.Delete();
			ringDesc.Delete();
			return false;
		}


		me->hEvent = CreateEvent(
			NULL,               // default security attributes
			TRUE,               // TRUE for manual reset event, FALSE for automatic
			FALSE,              // initial state is nonsignaled
			evName  // object name
		);
		if (me->hEvent == NULL)
		{
			rwSync.Delete();
			ringDesc.Delete();
			ring.Delete();
			return false;
		}

		((RWSync*)rwSync.Get())->ringSz = ringSz;
		((RWSync*)rwSync.Get())->ringBufSz = ringBufSz;
		return true;
	}

	bool Ring::Open()
	{
		RingOS* me = (RingOS*)&mOSData;
		int ringSz = 0;
		int ringBufSz = 0;

		if (!rwSync.Open(rwSyncShmemDescName, sizeof(RWSync)))
			//unable to create RW Sync area
			return false;

		ringSz = ((RWSync*)rwSync.Get())->ringSz;
		ringBufSz = ((RWSync*)rwSync.Get())->ringBufSz;

		if (!ringDesc.Open(ringDescShmemDescName, ringSz * sizeof(RingDesc)))
		{
			//unable to create descriptos shmem
			//log << "Ring::Open: unable to create descriptos shmem: (" << GetLastError() << ")\n";
			rwSync.Delete();
			return false;
		}

		if (!ring.Open(ringDescShmemName, ringSz * ringBufSz))//opening in global namespace (with "Global\\" prefix) produces access denied
		{
			//unable to create ring
			//log << "Ring::Open: unable to create ring shmem: (" << GetLastError() << ")\n";
			rwSync.Delete();
			ringDesc.Delete();
			return false;
		}

		me->hEvent = OpenEvent(
			EVENT_ALL_ACCESS | EVENT_MODIFY_STATE,               // default security attributes
			FALSE,               // do not inherit handle
			Ring::evName  // object name
		);

		if (me->hEvent == NULL)
		{
			rwSync.Delete();
			ringDesc.Delete();
			ring.Delete();
			return false;
		}

		return true;
	}

	bool Ring::OpenOrCreate(int ringSz, int ringBufSz)
	{
		if (!Open())
		{
			return Create(ringSz, ringBufSz);
		}
		return true;
	}

	void Ring::Delete()
	{
		RingOS* me = (RingOS*)&mOSData;
		rwSync.Delete();
		ring.Delete();
		ringDesc.Delete();

		if (me->hEvent)
		{
			CloseHandle(me->hEvent);
			me->hEvent = NULL;
		}
	}

	int Ring::incIdx(int idx, int ringSz) {
		idx++;
		if (idx == ringSz)
			idx = 0;

		return idx;
	}

#ifdef DIRECT_SHARED_MEMORY_ACCESS
	int Ring::StartWrite()//0 - success, -1 - error
	{
		RingOS* me = (RingOS*)&mOSData;
		RWSync* rws = (RWSync*)rwSync.Get();
		if (!rws)
			return -1;

		ResetEvent(me->hEvent);

		int cur = rws->cur = rws->next;
		RingDesc* desc = (RingDesc*)ringDesc.Get() + cur;

		return 0;
	}

	int Ring::EndWrite()
	{
		RingOS* me = (RingOS*)&mOSData;
		RWSync* rws = (RWSync*)rwSync.Get();
		if (!rws)
			return -1;

		int cur = rws->cur;
		RingDesc* desc = (RingDesc*)ringDesc.Get() + cur;
		unsigned short rnd = rand();
		desc->flags.bufid = (rnd != desc->flags.bufid) ? rnd : (rnd + 1)/*unsigned shot does not overflow: shot overflow: 0x7fff->0x8fff*/;

		//remember next position to write next
		rws->next = incIdx(rws->cur, rws->ringSz);

		//signal that there is something
		SetEvent(me->hEvent);
		return 0;
	}

#define WRITE_KEEPALIVE_TIMEOUT_MS 1000

	int Ring::StartRead(int tmo)
	{
		RingOS* me = (RingOS*)&mOSData;
		RWSync* rws = (RWSync*)rwSync.Get();
		if (!rws)
			return -1;

		int cur = rws->cur;
		RingDesc* desc = (RingDesc*)ringDesc.Get() + cur;

		//wait for new buf
		DWORD waitRes = WaitForSingleObject(me->hEvent, tmo);
		switch (waitRes)
		{
		case WAIT_OBJECT_0:
			//std::cout << "event waited\n";
			if (desc->flags.bufid != lastbufid)
			{
				//new buffer, get timestamp
				lastbufid = desc->flags.bufid;
				lastbufts = GetTickCount64();
				return 1;
			}
			else
			{
				//we already read that, check writer alive
				unsigned long long now = GetTickCount64();
				//if the same frame is there for WRITE_KEEPALIVE_TIMEOUT_MS msec, perhaps somethong wrong with writer
				if (now - lastbufts > WRITE_KEEPALIVE_TIMEOUT_MS)
				{
					ResetEvent(me->hEvent);
				}
				return 2;
			}
			break;
		case  WAIT_TIMEOUT:
			//just skip
			return 0;
		case WAIT_FAILED:
			//error happens, event might have been closed
		default:
			return -1;
		}
	}

	int Ring::EndRead()
	{
		RingOS* me = (RingOS*)&mOSData;
		RWSync* rws = (RWSync*)rwSync.Get();
		if (!rws)
			return -1;

		int cur = rws->cur;
		RingDesc* desc = (RingDesc*)ringDesc.Get() + cur;

		return 0;
	}

	void* Ring::GetCurrentBuffer()
	{
		RingOS* me = (RingOS*)&mOSData;
		RWSync* rws = (RWSync*)rwSync.Get();
		if (!rws)
			return nullptr;

		int cur = rws->cur;
		int ringBufSz = rws->ringBufSz;

		//DWORD waitRes = WaitForSingleObject(me->hEvent, 10);
		//switch (waitRes)
		//{
		//case  WAIT_TIMEOUT:
			//event is not set, we are writing to cur+1
			//cur = decIdx(cur, rws->ringSz);
		//default:
		//	break;
		//}

		return (void*)((char*)ring.Get() + cur * ringBufSz);
	}
#else
	int Ring::Write(void* buf, int sz)
	{
		RingOS* me = (RingOS*)&mOSData;
		RWSync* rws = (RWSync*)rwSync.Get();
		if (!rws)
			return -1;
		int cur = rws->cur = rws->next;
		int ringSz = rws->ringSz;
		int ringBufSz = rws->ringBufSz;
		RingDesc* first = (RingDesc*)ringDesc.Get();

		RingDesc* desc = first + cur;
		//if (!desc->flags.bufAvail)
		{
			int writeSz = sz > ringBufSz ? ringBufSz : sz;
			int retSz = ring.Write(buf, writeSz, cur * ringBufSz);

			//set buffer available for READING
			//desc->flags.bufAvail = 1;
			//startFrame/endFrame do not make sense
			desc->flags.startFrame = desc->flags.endFrame = 0;
			desc->sz = retSz;

			//signal that there is something
			SetEvent(me->hEvent);

			//remember next position to write next
			rws->next = incIdx(rws->next, ringSz);
			return retSz;
		}

		return 0;
	}

	int Ring::Read(void* buf, int sz, unsigned int tmo)
	{
		RingOS* me = (RingOS*)&mOSData;
		RWSync* rws = (RWSync*)rwSync.Get();
		if (!rws)
			return -1;
		int ringBufSz = rws->ringBufSz;

		DWORD waitRes = WaitForSingleObject(me->hEvent, tmo);
		switch (waitRes)
		{
		case WAIT_OBJECT_0:
			//signalled, we can read
			ResetEvent(me->hEvent);
			break;
		case  WAIT_TIMEOUT:
			//just skip
			return 0;
		case WAIT_FAILED:
			//error happens, event might have been closed
		default:
			//must close ring
			Delete();
			return -1;
		}

		int cur = rws->cur;

		//if (desc->flags.bufAvail)
		{
			int readSz = sz > ringBufSz ? ringBufSz : sz;
			int retSz = ring.Read(buf, readSz, cur * ringBufSz);

			if (retSz)
			{
				//set buffer NOT available for READING
				//desc->flags.bufAvail = 0;
				//other flags are invalid once buffer is read
				//sero out buffer size
				//desc->sz = 0;

				//advance readCur
				//rws->cur = incIdx(cur, ringSz);
				//curRead = incIdx(curRead, ringSz);

				return retSz;
			}
		}

		return 0;
	}

	int Ring::WriteFrame(void* buf, int sz)
	{
		RingOS* me = (RingOS*)&mOSData;
		RWSync* rws = (RWSync*)rwSync.Get();
		if (!rws)
			return -1;
		int cur = rws->cur = rws->next;
		int ringSz = rws->ringSz;
		int ringBufSz = rws->ringBufSz;
		RingDesc* first = (RingDesc*)ringDesc.Get();

		int writtenBytes = 0;
		RingDesc* desc = first + cur;
		while (true/*!desc->flags.bufAvail*/)
		{
			int writeSz = sz > ringBufSz ? ringBufSz : sz;
			int retSz = ring.Write((void*)((unsigned char*)buf + writtenBytes), writeSz, cur * ringBufSz);

			//set buffer available for READING
			//desc->flags.bufAvail = 1;
			if (!writtenBytes)
			{
				//set start frame if it is the first time we write
				desc->flags.startFrame = 1;
			}
			desc->flags.endFrame = 0;
			desc->sz = retSz;

			writtenBytes += retSz;
			sz -= writeSz;
			if (sz == 0)
			{
				desc->flags.endFrame = 1;
				break;
			}

			//continue
			cur = incIdx(cur, ringSz);
			desc = first + cur;
		}
		//we have written as many as possible chunks
		if (writtenBytes)
		{
			//advance next
			rws->next = incIdx(cur, ringSz);

			//signal that there is something
			SetEvent(me->hEvent);
		}

		return writtenBytes;
	}

	int Ring::ReadFrame(void* buf, int sz, unsigned int tmo)
	{
		RingOS* me = (RingOS*)&mOSData;
		int readBytes = 0;
		RWSync* rws = (RWSync*)rwSync.Get();
		if (!rws)
			return -1;
		int ringSz = rws->ringSz;
		int ringBufSz = rws->ringBufSz;
		RingDesc* first = (RingDesc*)ringDesc.Get();

		DWORD waitRes = WaitForSingleObject(me->hEvent, tmo);
		switch (waitRes)
		{
		case WAIT_OBJECT_0:
			//signalled, we can read
			ResetEvent(me->hEvent);
			break;
		case  WAIT_TIMEOUT:
			//just skip
			return 0;
		case WAIT_FAILED:
			//error happens, event might have been closed
		default:
			//must close ring
			Delete();
			return -1;
		}

		int cur = rws->cur;
		RingDesc* desc = first + cur;

		while (true/*desc->flags.bufAvail*/)
		{
			int readSz = sz > ringBufSz ? ringBufSz : sz;
			int retSz = ring.Read((void*)((unsigned char*)buf + readBytes), readSz, cur * ringBufSz);

			if (retSz > 0)
			{
				//set actual bytes
				readBytes += desc->sz;

				//set buffer NOT available for READING
				//desc->flags.bufAvail = 0;
				//other flags are invalid once buffer is read
				//sero out buffer size
				//desc->sz = 0;

				sz -= retSz;
				if (desc->flags.endFrame)
				{
					//frame read
					break;
				}

				//continue
				cur = incIdx(cur, ringSz);
				desc = first + cur;
			}
			else
			{
				//just break
				break;
			}
		}

		//change cur index
		//rws->cur = cur;
		return readBytes;
	}
#endif
}