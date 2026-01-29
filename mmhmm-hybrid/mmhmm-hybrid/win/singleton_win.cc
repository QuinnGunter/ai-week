#include "singleton_win.h"
#include "../browser/root_window_win.h"
#include <thread>
#include "../browser/util_win.h"
#include "../browser/resource.h"

namespace mmhmm
{

  const std::wstring AppMutexName = L"mmhmm_desktop_mutex";

  const int NumMessages = 5;
  const int MessageSize = 5 * 1024;
  const int ReadTimeoutMs = 500;

  Singleton::Singleton(std::function<void(std::wstring)> args_received_callback)
      : args_received_callback_(args_received_callback),
    single_instance_mutex_(nullptr)
  {
    ipc_writer_.OpenOrCreate(NumMessages, MessageSize);
    initialized_ = true;
  }

  Singleton::~Singleton()
  {
    Reset();
  }

  void Singleton::StartListening()
  {
    listener_thread_ = std::thread(&Singleton::Listen, this);
  }

  bool Singleton::CanCreate()
  {
    single_instance_mutex_ = CreateMutex(NULL, TRUE, AppMutexName.c_str());
    if (single_instance_mutex_ == NULL || GetLastError() == ERROR_ALREADY_EXISTS) {
      single_instance_mutex_ = nullptr;
      return false;
    }

    return true;
  }

  void Singleton::Activate() const{
    HWND existingApp = FindWindow(0, GetResourceString(IDS_APP_TITLE).c_str());
    if (existingApp) {
      SetForegroundWindow(existingApp);
    }
  }

  void Singleton::Reset()
  {
    if (initialized_)
    {
      initialized_ = false;
      if (listener_thread_.joinable())
      {
        listener_thread_.join();
      }
      if (single_instance_mutex_)
      {
        CloseHandle(single_instance_mutex_);
      }
    }
  }

  //Buffer format
  // 
  //||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||
  //| size of args string in bytes (int) | args string (wstring) |
  //||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||
  //
  void Singleton::ForwardArgsToSingletonProcess(CefRefPtr<CefCommandLine> args)
  {
    auto argsString = args->GetCommandLineString();
    auto argsWString = argsString.ToWString();

    //size of the argument string
    int args_size = (int)argsWString.size() * sizeof(wchar_t);
    //overall size of the message including the size int placed at the start
    int message_size = sizeof(int) + args_size;

    std::unique_ptr<char[]> message(new char[message_size]);

    //copy args size into start of buffer
    memcpy(message.get(), &args_size, sizeof(int));
    //copy the args into the rest of the buffer
    memcpy(message.get() + sizeof(int), (void*)argsWString.c_str(), args_size);
    //send the buffer to the IPC writer
    ipc_writer_.WriteFrame(message.get(), message_size);
  }

  void Singleton::Listen()
  {
    while (initialized_)
    {
      std::unique_ptr<char[]> message(new char[MessageSize]);

      if (ipc_writer_.ReadFrame((void*)message.get(), MessageSize, ReadTimeoutMs) > 0)
      {
        //read the size of the args string from the int at the front of the buffer
        int args_size = *reinterpret_cast<int*>((message.get()));
        std::wstring args;
        args.assign((wchar_t*)(message.get() + sizeof(int)), (args_size / sizeof(wchar_t)));

        args_ = args;

        if (args_received_callback_)
          args_received_callback_(args);
      }
    }
  }

  bool Singleton::IsInstanceAlreadyRunning() {
    HANDLE mutex = CreateMutex(NULL, TRUE, AppMutexName.c_str());
    bool is_already_running = false;
    if (mutex && GetLastError() == ERROR_ALREADY_EXISTS) {
      is_already_running = true;
    }

    if (mutex) {
      CloseHandle(mutex);
    }
    return is_already_running;
  }
}
