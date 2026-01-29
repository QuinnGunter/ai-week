//
// mmhmm Windows
// Copyright © 2020-2023 mmhmm, inc. All rights reserved.
//
#pragma once

#include <atomic>
#include <functional>
#include <string>
#include <thread>
#include <Windows.h>
#include "include\cef_command_line.h"
#include "shmem.h"

namespace mmhmm
{
	class Singleton
	{
	public:
		Singleton(std::function<void(std::wstring)> args_received_callback);
		~Singleton();

		bool CanCreate();
		void Activate() const;
		void Reset();
		void ForwardArgsToSingletonProcess(CefRefPtr<CefCommandLine> args);
		void StartListening();
    static bool IsInstanceAlreadyRunning();

	private:
		void Listen();

	private:
		HANDLE single_instance_mutex_;
		Ring ipc_writer_;
		std::thread listener_thread_;
		std::atomic_bool initialized_;
		std::wstring args_;
		std::function<void(std::wstring)> args_received_callback_;
	};
}
