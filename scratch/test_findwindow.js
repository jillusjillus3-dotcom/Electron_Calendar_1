const { app } = require("electron");
const fs = require("fs");
const path = require("path");
const koffi = require("koffi");

app.whenReady().then(() => {
    const user32 = koffi.load("user32.dll");
    const FindWindowA = user32.func("uintptr_t FindWindowA(str className, uintptr_t windowName)");
    const FindWindowW = user32.func("uintptr_t FindWindowW(str16 className, uintptr_t windowName)");
    const GetShellWindow = user32.func("uintptr_t GetShellWindow()");
    const GetDesktopWindow = user32.func("uintptr_t GetDesktopWindow()");

    const pA = FindWindowA("Progman", 0);
    const pW = FindWindowW("Progman", 0);
    const shell = GetShellWindow();
    const desktop = GetDesktopWindow();

    const output = `FindWindowA Progman: ${pA}\nFindWindowW Progman: ${pW}\nGetShellWindow: ${shell}\nGetDesktopWindow: ${desktop}\n`;
    fs.writeFileSync(path.join(__dirname, "test_output.txt"), output);
    app.quit();
});
