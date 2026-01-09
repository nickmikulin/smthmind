var db = new Dexie("ThoughtsDatabase");

db.version(1).stores({
  thoughts: `
      timestamp,
      tag,
      mood`,
});

db.open()
  .then(() => {
    getAndDisplayThoughts();
  })
  .catch((error) => {
    console.error("Failed to open database:", error);
  });

document.addEventListener("DOMContentLoaded", function () {
  document
    .getElementById("newItem")
    .addEventListener("submit", function (event) {
      event.preventDefault();
      let itemText = document.getElementById("newItemText").value;
      let itemTag = document.getElementById("newItemTag").value.toUpperCase();

      let moodCheck = document.querySelector(`input[name="sentiment"]:checked`);

      if (moodCheck == null) {
        let moodElement = document.getElementById("moodCheck");

        moodElement.style.animation = "none";
        moodElement.offsetHeight;
        moodElement.style.animation = "shake 1s ease-in-out";
      } else {
        let itemMood = moodCheck.value;
        const timestamp = Date.now();

        db.thoughts
          .add({
            timestamp: timestamp,
            tag: itemTag,
            mood: itemMood,
            text: itemText,
          })
          .then(() => {
            document.getElementById("newItemText").value = "";
            document.getElementById("newItemTag").value = "";
            document.querySelector(
              `input[name="sentiment"]:checked`
            ).checked = false;
            document.activeElement.blur();
            addNewItemToList(timestamp, itemTag, itemMood, itemText);
          });
        umami.track("record added", { mood: itemMood });
      }
    });

  document.querySelectorAll(".sentimentLabel").forEach((label) => {
    label.addEventListener("mousedown", (e) => {
      const activeElement = document.activeElement;
      e.preventDefault();
      label.querySelector('input[type="radio"]').checked = true;
      if (
        activeElement &&
        (activeElement.id === "newItemText" ||
          activeElement.id === "newItemTag")
      ) {
        activeElement.focus();
      }
    });
  });

  document.getElementById("actionButton").addEventListener("mousedown", (e) => {
    e.preventDefault();
  });
});

function getAndDisplayThoughts(newItemTimestamp = null) {
  db.thoughts
    .reverse()
    .toArray()
    .then((items) => {
      displayThoughts(items, newItemTimestamp);
      const count = items.length;
      if (count == 0) {
        document.getElementById("listHeader").style.display = "none";
      } else {
        const counter =
          items.length != 1 ? `${count} RECORDS` : `${count} RECORD`;
        document.getElementById("clearFilter").style.display = "none";
        document.getElementById("listFilter").innerHTML = counter;
        document.getElementById("menu").style.display = "flex";
        showTags();
      }
    });
}

function filterThoughts(filter, value) {
  db.thoughts
    .where(filter)
    .equals(value)
    .reverse()
    .toArray()
    .then((items) => {
      displayThoughts(items);
      const count = items.length;
      document.getElementById("listFilter").innerHTML =
        filter == "mood"
          ? `<img id='filterMood' src='assets/${value}.png' alt='${value}'></img> [${count}]`
          : `#${value} [${count}]`;
      document.getElementById("menu").style.display = "none";
      document.getElementById("clearFilter").style.display = "block";
      document.getElementById("filters").innerHTML = "";
    });
}

function displayThoughts(items, newItemTimestamp = null) {
  let itemsList = "";
  let oldDate = "";
  const monthNames = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];

  if (items.length == 0) {
    document.getElementById("list").innerHTML =
      "<div id='emptyState'><img src='assets/empty.png' alt='smthmind logo'/><p>Record your thoughts and mood for reflection. Everything is stored locally in your browser. Export data when you need it.</p></div>";
  } else {
    for (let i = 0; i < items.length; i++) {
      let item = items[i];
      let newDate = new Date(item.timestamp).getDate();

      if (newDate != oldDate) {
        const isNewDate = i === 0 && newItemTimestamp === item.timestamp;
        itemsList +=
          `<div class='date${isNewDate ? " new" : ""}'>` +
          new Date(item.timestamp).getDate() +
          " " +
          monthNames[new Date(item.timestamp).getMonth()] +
          " " +
          new Date(item.timestamp).getFullYear() +
          "</div>";
      }

      oldDate = new Date(item.timestamp).getDate();

      const timeString = new Date(item.timestamp).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });

      const itemTag =
        item.tag == ""
          ? ""
          : `<div class='itemTag' onClick='filterThoughts("tag", "${item.tag}")'>#${item.tag}</div>`;

      const isNewItem = newItemTimestamp === item.timestamp;
      itemsList +=
        `<div class='item${isNewItem ? " new" : ""}' data-timestamp='${
          item.timestamp
        }'><img class='itemSentiment' onClick='filterThoughts("mood", "${
          item.mood
        }")' src='assets/` +
        item.mood +
        ".png' alt='" +
        item.mood +
        "' /><div class='itemContent'><div class='itemHeader'><div class='itemData'>" +
        timeString +
        itemTag +
        "</div><div class='itemDelete' onClick='deleteItem(" +
        item.timestamp +
        ")'></div></div><div class='itemText'>" +
        item.text +
        "</div></div></div>";
    }
    document.getElementById("list").innerHTML = itemsList;
    document.getElementById("listHeader").style.display = "flex";
  }
}

function addNewItemToList(timestamp, tag, mood, text) {
  const monthNames = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];

  const date = new Date(timestamp);
  const dateStr = `${date.getDate()} ${
    monthNames[date.getMonth()]
  } ${date.getFullYear()}`;
  const timeString = date.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

  const listElement = document.getElementById("list");

  const emptyState = listElement.querySelector("#emptyState");
  if (emptyState) {
    emptyState.remove();
  }

  const existingFirstDate = listElement.querySelector(".date");

  const needsNewDate =
    !existingFirstDate || existingFirstDate.textContent.trim() !== dateStr;

  if (needsNewDate) {
    const dateElement = document.createElement("div");
    dateElement.className = "date new";
    dateElement.textContent = dateStr;
    listElement.insertBefore(dateElement, listElement.firstChild);
  }

  const existingItems = Array.from(listElement.querySelectorAll(".item"));
  const oldPositions = existingItems.map(
    (item) => item.getBoundingClientRect().top
  );

  const itemElement = document.createElement("div");
  itemElement.className = "item new";
  itemElement.dataset.timestamp = timestamp;

  const itemTag =
    tag === ""
      ? ""
      : `<div class='itemTag' onClick='filterThoughts("tag", "${tag}")'>#${tag}</div>`;

  itemElement.innerHTML = `<img class='itemSentiment' onClick='filterThoughts("mood", "${mood}")' src='assets/${mood}.png' alt='${mood}' /><div class='itemContent'><div class='itemHeader'><div class='itemData'>${timeString}${itemTag}</div><div class='itemDelete' onClick='deleteItem(${timestamp})'></div></div><div class='itemText'>${text}</div></div>`;

  const firstItem = listElement.querySelector(".item");
  if (firstItem) {
    listElement.insertBefore(itemElement, firstItem);
  } else {
    listElement.appendChild(itemElement);
  }

  existingItems.forEach((item, index) => {
    const newPosition = item.getBoundingClientRect().top;
    const delta = oldPositions[index] - newPosition;

    if (delta !== 0) {
      item.style.transform = `translateY(${delta}px)`;
      item.style.transition = "none";

      requestAnimationFrame(() => {
        item.style.transition = "transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)";
        item.style.transform = "translateY(0)";
      });
    }
  });

  db.thoughts.count().then((count) => {
    const counter = count !== 1 ? `${count} RECORDS` : `${count} RECORD`;
    document.getElementById("listFilter").innerHTML = counter;
    document.getElementById("listHeader").style.display = "flex";
  });

  showTags();
}

function deleteItem(timestamp) {
  const confirmDelete = confirm("Are you sure you want to delete this?");
  if (confirmDelete) {
    const itemToDelete = document.querySelector(
      `.item[data-timestamp="${timestamp}"]`
    );

    if (itemToDelete) {
      const listElement = document.getElementById("list");

      const allItems = Array.from(listElement.querySelectorAll(".item"));
      const deleteIndex = allItems.indexOf(itemToDelete);
      const itemsBelow = allItems.slice(deleteIndex + 1);
      const oldPositions = itemsBelow.map(
        (item) => item.getBoundingClientRect().top
      );

      itemToDelete.style.transition =
        "opacity 0.2s ease-out, transform 0.2s ease-out";
      itemToDelete.style.opacity = "0";
      itemToDelete.style.transform = "translateX(-20px)";

      setTimeout(() => {
        db.thoughts.delete(timestamp).then(() => {
          itemToDelete.remove();

          itemsBelow.forEach((item, index) => {
            const newPosition = item.getBoundingClientRect().top;
            const delta = oldPositions[index] - newPosition;

            if (delta !== 0) {
              item.style.transform = `translateY(${delta}px)`;
              item.style.transition = "none";

              requestAnimationFrame(() => {
                item.style.transition =
                  "transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)";
                item.style.transform = "translateY(0)";
              });
            }
          });

          db.thoughts.count().then((count) => {
            if (count === 0) {
              document.getElementById("list").innerHTML =
                "<div id='emptyState'><img src='assets/empty.png' alt='smthmind logo'/><p>Record your thoughts and mood for reflection. Everything is stored locally in your browser. Export data when you need it.</p></div>";
              document.getElementById("listHeader").style.display = "none";
            } else {
              const counter =
                count !== 1 ? `${count} RECORDS` : `${count} RECORD`;
              document.getElementById("listFilter").innerHTML = counter;
            }
          });

          showTags();
        });

        umami.track("record deleted");
      }, 200);
    }
  }
}

function showTags() {
  const tags = db.thoughts.orderBy("tag").uniqueKeys();
  tags.then((tags) => {
    const tagsList = tags
      .filter((tag) => tag != "")
      .map((tag) => {
        return `<div class='itemTag' onClick='filterThoughts("tag", "${tag}")'>#${tag}</div>`;
      });
    document.getElementById("filters").innerHTML = tagsList.join("");
  });
}

document.addEventListener("DOMContentLoaded", () => {
  const exportLink = document.getElementById("exportLink");

  exportLink.onclick = async () => {
    try {
      const blob = await db.export({ prettyJson: true, progressCallback });
      download(blob, "my_smthmind_data.json", "application/json");
      umami.track("export success");
    } catch (error) {
      console.error("" + error);
      umami.track("export error");
    }
  };
});

function progressCallback({ totalRows, completedRows }) {
  console.log(`Progress: ${completedRows} of ${totalRows} rows completed`);
}
