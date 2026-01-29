#pragma once

#include "../../../win/memix/CameraStatistics/src/CameraStatisticsEvent.h"
#include "../../win/memix/CameraStatistics/src/CameraStatisticsConsumer.h"
namespace CameraStatistics {

struct CameraStatisticsClientEvent {
  CameraStatisticsEventType event;
  CameraStatisticsConsumerType source{CameraStatisticsConsumerType::Other};
  std::string source_as_string {};
};
}