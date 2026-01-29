#pragma once

namespace mmhmm {

	class Shmem
	{
		char  mOSData[64];
		int	  memSize;
	public:
		Shmem();
		bool Create(const wchar_t* szName, int sz);
		bool Open(const wchar_t* szName, int sz);
		void Delete();
		int Write(const void* inBuf, int sz, int offset);
		int Read(void* outBuf, int sz, int offset);
		void* Get();
	};

	struct RWSync
	{
		int ringSz;
		int ringBufSz;
		int cur;
		int next;
	};

	struct RingDesc
	{
		struct
		{
			//does not seem to be necssary for multiple consumers,
			//write only writes andf then signel, it is up to readers wait for signal and read imediatele,
			//writer canno wait all consumers
			//unsigned int bufAvail : 1;//from client prospective, buf avail for READING
			unsigned int startFrame : 1;//indicates that current buffer contains start of new media frame
			unsigned int endFrame : 1;//indicates that current buffer contains start of new media frame
			unsigned int bufid : 16;//unique ID for consumers to check if they consume that exact buffer, 0 - RAND_MAX (0x7fff);
		} flags;
		unsigned int sz;
	};

	class Ring
	{
		Shmem rwSync;
		Shmem ring;
		Shmem ringDesc;
		char  mOSData[64];

		unsigned int lastbufid;//id
		unsigned long long lastbufts;//timestamp

		int incIdx(int idx, int ringSz);

	public:
		static const wchar_t evName[];
		Ring();
		bool Create(int ringSz, int ringBufSz);
		bool Open();
		bool OpenOrCreate(int ringSz, int ringBufSz);
		void Delete();

#ifdef DIRECT_SHARED_MEMORY_ACCESS
		//new read/write methods
		int StartWrite();
		int EndWrite();
		int StartRead(int tmo = 50);
		int EndRead();
		void* GetCurrentBuffer();
#else
		int Write(void* buf, int sz);
		int Read(void* buf, int sz, unsigned int tmo);

		//WARNING!!! LIMITATION, total ring buffers size must be larger tham frame size (in bytes)
		int WriteFrame(void* buf, int sz);
		int ReadFrame(void* buf, int sz, unsigned int tmo);
#endif
	};
}