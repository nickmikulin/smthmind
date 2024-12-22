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

        db.thoughts
          .add({
            timestamp: Date.now(),
            tag: itemTag,
            mood: itemMood,
            text: itemText,
          })
          .then(getAndDisplayThoughts);
        umami.track("record added", { mood: itemMood });

        document.getElementById("newItemText").value = "";
        document.getElementById("newItemTag").value = "";
        document.querySelector(
          `input[name="sentiment"]:checked`
        ).checked = false;
      }
    });
});

function getAndDisplayThoughts() {
  db.thoughts.reverse().toArray().then(displayThoughts);
  document.getElementById("clearFilter").innerHTML = "";
  document.getElementById("listFilter").innerHTML = "EVERYTHING";
  document.getElementById("exportLink").innerHTML = "⤓ Export";
}

function filterThoughts(filter, value) {
  db.thoughts
    .where(filter)
    .equals(value)
    .reverse()
    .toArray()
    .then(displayThoughts);

  document.getElementById("listFilter").innerHTML =
    filter == "mood"
      ? `<img id='filterMood' src='assets/${value}.png' alt='${value}'></img>`
      : value;
  document.getElementById("clearFilter").innerHTML = "✗ Clear";
  document.getElementById("exportLink").innerHTML = "";
}

function displayThoughts(items) {
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
        itemsList +=
          "<div class='date'>" +
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
          : ` # <div class='itemTag' onClick='filterThoughts("tag", "${item.tag}")'>${item.tag}</div>`;

      itemsList +=
        `<div class='item'><img class='itemSentiment' onClick='filterThoughts("mood", "${item.mood}")' src='assets/` +
        item.mood +
        ".png' alt='" +
        item.mood +
        "' /><div class='itemContent'><div class='itemHeader'><div class='itemData'>" +
        timeString +
        itemTag +
        "</div><div class='itemDelete' onClick='deleteItem(" +
        item.timestamp +
        ")'>✗ Del</div></div><div class='itemText'>" +
        item.text +
        "</div></div></div>";
    }
    document.getElementById("list").innerHTML = itemsList;
    document.getElementById("listHeader").style.display = "flex";
  }
}

function deleteItem(timestamp) {
  const confirmDelete = confirm("Are you sure you want to delete this?");
  if (confirmDelete) {
    db.thoughts.delete(timestamp).then(getAndDisplayThoughts);
    umami.track("record deleted");
  }
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
