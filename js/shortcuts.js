document.addEventListener("keydown", handleShortcut);

function handleShortcut(event) {
  switch (event.key) {
    case "/":
      event.preventDefault();
      const textArea = document.getElementById("newItemText");
      const tagInput = document.getElementById("newItemTag");
      if (textArea) {
        document.activeElement == textArea
          ? tagInput.focus()
          : textArea.focus();
      }
      break;
    case "Enter":
      event.preventDefault();
      const form = document.getElementById("newItem");
      if (form) {
        let form = document.getElementById("newItem");
        form.dispatchEvent(new Event("submit"));
      }
      break;
  }
  if (event.ctrlKey) {
    event.preventDefault();

    switch (event.key) {
      case "1":
        event.preventDefault();
        document.getElementById("angry").checked = true;
        break;
      case "2":
        event.preventDefault();
        document.getElementById("sad").checked = true;
        break;
      case "3":
        event.preventDefault();
        document.getElementById("neutral").checked = true;
        break;
      case "4":
        event.preventDefault();
        document.getElementById("good").checked = true;
        break;
      case "5":
        event.preventDefault();
        document.getElementById("happy").checked = true;
        break;
    }
  }
}
