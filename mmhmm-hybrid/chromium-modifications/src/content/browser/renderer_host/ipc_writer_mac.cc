//
// mmhmm
// Copyright � 2020-2022 mmhmm, inc. All rights reserved.
//
#include "ipc_writer_mac.h"
#include "CameraExtensionConnector.h"

namespace mmhmm
{
	IpcWriterMac::IpcWriterMac() : m_isOpen(false)
	{

	}

	IpcWriterMac::~IpcWriterMac()
	{

	}

	bool IpcWriterMac::Initialize()
	{
      m_isOpen = camera_extension_initialize();
      return m_isOpen;
	}

	bool IpcWriterMac::SendFrame(IOSurfaceRef io_surface)
	{
      return camera_extension_send(io_surface);
	}

	bool IpcWriterMac::IsOpen()
	{
      return m_isOpen;
	}
}
