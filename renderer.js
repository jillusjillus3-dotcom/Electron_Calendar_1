const FLIP_DURATION_MS = 360;
const DRAG_THRESHOLD_PX = 6;

const calendar = document.getElementById("calendar");
const activeFace = document.getElementById("active-face");
const faceTemplate = document.getElementById("calendar-face-template");

const layers = {
    incomingTop: document.getElementById("incoming-top"),
    incomingBottom: document.getElementById("incoming-bottom"),
    outgoingTop: document.getElementById("outgoing-top"),
    outgoingBottom: document.getElementById("outgoing-bottom"),
    incomingTopFace: document.getElementById("incoming-top-face"),
    incomingBottomFace: document.getElementById("incoming-bottom-face"),
    outgoingTopFace: document.getElementById("outgoing-top-face"),
    outgoingBottomFace: document.getElementById("outgoing-bottom-face")
};

const flipAudio1 = new Audio("assets/audio_1.mp3");
const flipAudio2 = new Audio("assets/audio_2.mp3");

flipAudio1.preload = "auto";
flipAudio2.preload = "auto";

function playFlipSound(direction) {
    try {
        const audioTemplate = direction > 0 ? flipAudio1 : flipAudio2;
        const sound = audioTemplate.cloneNode(true);
        sound.volume = 0.7;
        sound.play().catch(() => {});
    } catch (error) {
        // Ignore audio playback exceptions silently
    }
}

let displayDate = startOfDay(new Date());
let followsToday = true;
let isFlipping = false;
let pointerState = null;
let flipTimer = null;

function startOfDay(date) {
    return new Date(
        date.getFullYear(),
        date.getMonth(),
        date.getDate()
    );
}

function addDays(date, days) {
    const nextDate = startOfDay(date);
    nextDate.setDate(nextDate.getDate() + days);

    return nextDate;
}

function isSameDate(firstDate, secondDate) {
    return (
        firstDate.getFullYear() === secondDate.getFullYear() &&
        firstDate.getMonth() === secondDate.getMonth() &&
        firstDate.getDate() === secondDate.getDate()
    );
}

function toDateKey(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
}

function getCalendarFields(date) {
    return {
        day: date.toLocaleDateString("en-US", {
            weekday: "long"
        }).toUpperCase(),
        date: String(date.getDate()).padStart(2, "0"),
        month: date.toLocaleDateString("en-US", {
            month: "long"
        }).toUpperCase(),
        year: String(date.getFullYear())
    };
}

function fillCalendarFields(root, date) {
    const fields = getCalendarFields(date);

    Object.entries(fields).forEach(([field, value]) => {
        const element = root.querySelector(`[data-calendar-field="${field}"]`);

        if (element) {
            element.textContent = value;
        }
    });
}

function renderActiveDate(date) {
    fillCalendarFields(activeFace, date);
    calendar.dataset.currentDate = toDateKey(date);
}

function renderLayer(faceElement, date) {
    faceElement.replaceChildren(
        faceTemplate.content.cloneNode(true)
    );

    fillCalendarFields(faceElement, date);
}

function setLayerVisible(layer, visible) {
    layer.classList.toggle("hidden", !visible);
}

function hideFlipLayers() {
    [
        layers.incomingTop,
        layers.incomingBottom,
        layers.outgoingTop,
        layers.outgoingBottom
    ].forEach((layer) => setLayerVisible(layer, false));
}

function finishFlip(nextDate) {
    displayDate = nextDate;
    renderActiveDate(displayDate);
    hideFlipLayers();

    calendar.classList.remove(
        "is-flipping",
        "flip-forward",
        "flip-back"
    );

    isFlipping = false;
}

function flipDate(direction) {
    if (isFlipping) {
        return;
    }

    const nextDate = addDays(displayDate, direction);
    const isForward = direction > 0;
    const incomingLayer = isForward ? layers.incomingBottom : layers.incomingTop;
    const outgoingLayer = isForward ? layers.outgoingBottom : layers.outgoingTop;
    const incomingFace = isForward ? layers.incomingBottomFace : layers.incomingTopFace;
    const outgoingFace = isForward ? layers.outgoingBottomFace : layers.outgoingTopFace;
    let flipFinished = false;
    let midFlipTimer = null;

    followsToday = false;
    isFlipping = true;

    playFlipSound(direction);

    renderLayer(incomingFace, nextDate);
    renderLayer(outgoingFace, displayDate);
    renderActiveDate(displayDate);

    hideFlipLayers();
    setLayerVisible(incomingLayer, true);
    setLayerVisible(outgoingLayer, true);

    calendar.classList.remove(
        "flip-forward",
        "flip-back"
    );

    calendar.classList.add("is-flipping");

    // Restart the CSS keyframes for rapid repeated interactions.
    void outgoingLayer.offsetWidth;

    calendar.classList.add(
        isForward ? "flip-forward" : "flip-back"
    );

    // Update active face halfway through rotation (~180ms) when flap is edge-on (90 deg)
    midFlipTimer = setTimeout(() => {
        if (isFlipping) {
            renderActiveDate(nextDate);
        }
    }, Math.floor(FLIP_DURATION_MS / 2));

    const completeFlip = () => {
        if (flipFinished) {
            return;
        }

        flipFinished = true;
        clearTimeout(flipTimer);
        clearTimeout(midFlipTimer);
        finishFlip(nextDate);
    };

    outgoingLayer.addEventListener(
        "animationend",
        completeFlip,
        {
            once: true
        }
    );

    flipTimer = setTimeout(
        completeFlip,
        FLIP_DURATION_MS + 20
    );
}

function syncTodayIfNeeded() {
    if (!followsToday || isFlipping) {
        return;
    }

    const today = startOfDay(new Date());

    if (!isSameDate(displayDate, today)) {
        displayDate = today;
        renderActiveDate(displayDate);
    }
}

function getFlipZone(event) {
    const zone = event.target.closest("[data-flip-zone]");

    if (!zone || !calendar.contains(zone)) {
        return null;
    }

    return zone.dataset.flipZone;
}

function startPointerInteraction(event) {
    if (
        !event.isPrimary ||
        (
            event.pointerType === "mouse" &&
            event.button !== 0
        )
    ) {
        return;
    }

    pointerState = {
        pointerId: event.pointerId,
        startScreenX: event.screenX,
        startScreenY: event.screenY,
        zone: getFlipZone(event),
        dragging: false
    };

    calendar.setPointerCapture(event.pointerId);
    event.preventDefault();
}

function updatePointerInteraction(event) {
    if (
        !pointerState ||
        pointerState.pointerId !== event.pointerId
    ) {
        return;
    }

    const deltaX = event.screenX - pointerState.startScreenX;
    const deltaY = event.screenY - pointerState.startScreenY;
    const distance = Math.hypot(deltaX, deltaY);

    if (
        !pointerState.dragging &&
        distance >= DRAG_THRESHOLD_PX
    ) {
        pointerState.dragging = true;

        if (window.electronAPI) {
            window.electronAPI.startDrag(
                pointerState.startScreenX,
                pointerState.startScreenY
            );
        }
    }

    if (
        pointerState.dragging &&
        window.electronAPI
    ) {
        window.electronAPI.drag(
            event.screenX,
            event.screenY
        );
    }
}

function stopPointerInteraction(event) {
    if (
        !pointerState ||
        pointerState.pointerId !== event.pointerId
    ) {
        return;
    }

    if (pointerState.dragging) {
        if (window.electronAPI) {
            window.electronAPI.stopDrag();
        }
    } else if (pointerState.zone === "next") {
        flipDate(1);
    } else if (pointerState.zone === "previous") {
        flipDate(-1);
    }

    calendar.releasePointerCapture(event.pointerId);
    pointerState = null;
}

function cancelPointerInteraction(event) {
    if (
        !pointerState ||
        pointerState.pointerId !== event.pointerId
    ) {
        return;
    }

    if (
        pointerState.dragging &&
        window.electronAPI
    ) {
        window.electronAPI.stopDrag();
    }

    calendar.releasePointerCapture(event.pointerId);
    pointerState = null;
}

renderActiveDate(displayDate);
hideFlipLayers();

calendar.addEventListener("pointerdown", startPointerInteraction);
calendar.addEventListener("pointermove", updatePointerInteraction);
calendar.addEventListener("pointerup", stopPointerInteraction);
calendar.addEventListener("pointercancel", cancelPointerInteraction);

setInterval(syncTodayIfNeeded, 60000);
