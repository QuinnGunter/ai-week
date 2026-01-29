//
// mmhmm
// Copyright � 2020-2022 mmhmm, inc. All rights reserved.
//
#ifndef CONTENT_BROWSER_RENDERER_HOST_IPC_WRITER_MAC_H_
#define CONTENT_BROWSER_RENDERER_HOST_IPC_WRITER_MAC_H_
#include <stdint.h>
#include <IOSurface/IOSurface.h>

namespace mmhmm {

	class IpcWriterMac {
	public:
		IpcWriterMac();
		~IpcWriterMac();

		bool Initialize();
		bool SendFrame(IOSurfaceRef io_surface);
		bool IsOpen();
	private:
		bool m_isOpen;
	};

}

#endif
