//
// mmhmm Windows
// Copyright © 2020-2022 mmhmm, inc. All rights reserved.
//
#ifndef CONTENT_BROWSER_RENDERER_HOST_IPC_WRITER_H_
#define CONTENT_BROWSER_RENDERER_HOST_IPC_WRITER_H_

#if BUILDFLAG(IS_WIN)
#include "ipc_writer_win.h"
#elif BUILDFLAG(IS_MAC)
#include "ipc_writer_mac.h"
#endif

namespace mmhmm {

#if BUILDFLAG(IS_WIN)
	typedef IpcWriterWin IpcWriter;
#elif BUILDFLAG(IS_MAC)
	typedef IpcWriterMac IpcWriter;
#endif

}  // namespace mmhmm

#endif  // CONTENT_BROWSER_RENDERER_HOST_IPC_WRITER_H_
