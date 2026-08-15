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
}

updateCalendar();

setInterval(updateCalendar, 60000);