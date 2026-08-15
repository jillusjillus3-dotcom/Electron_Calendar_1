function updateCalendar() {
    const today = new Date();

    const day = today.toLocaleDateString("en-US", {
        weekday: "long"
    });

    const date = today.getDate();

    const month = today.toLocaleDateString("en-US", {
        month: "long"
    });

    const year = today.getFullYear();

    document.getElementById("day").textContent = day.toUpperCase();
    document.getElementById("date").textContent = date;
    document.getElementById("month").textContent = month.toUpperCase();
    document.getElementById("year").textContent = year;

    let dragging = false;

document.addEventListener("mousedown", (event) => {

    if (event.button !== 0) {
        return;
    }

    dragging = true;

    window.electronAPI.startDrag(
        event.screenX,
        event.screenY
    );
});

document.addEventListener("mousemove", (event) => {

    if (!dragging) {
        return;
    }

    window.electronAPI.drag(
        event.screenX,
        event.screenY
    );
});

document.addEventListener("mouseup", (event) => {

    if (event.button !== 0) {
        return;
    }

    dragging = false;

    window.electronAPI.stopDrag();
});
}

updateCalendar();

setInterval(updateCalendar, 60000);