//
// mmhmm Windows
// Copyright © 2020-2022 mmhmm, inc. All rights reserved.
//
#pragma once

#if defined (OS_WIN)
#include "screen_share_manager_win.h"
#endif

namespace mmhmm {

#if defined (OS_WIN)
	typedef ScreenShareManagerWin ScreenShareManager;
#endif

}  // namespace mmhmm

