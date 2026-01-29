#include <stdexcept>

#pragma once

namespace mmhmm {

    class NotImplementedException : public std::logic_error
    {
    public:
      NotImplementedException() : std::logic_error{ "Not implemented." } {}
    };
}


