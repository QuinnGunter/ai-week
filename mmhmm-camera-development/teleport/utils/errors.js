function AbstractError() {
    return new Error("Abstract method");
}

function InternalApplicationError() {
    return new Error("Internal application error");
}
