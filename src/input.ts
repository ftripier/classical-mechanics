export default class Input {
  element: HTMLInputElement;
  onchange: (e?: Event) => void;
  constructor(name = "", value = "", onchange = (e?: Event) => {}) {
    let inputArea = document.querySelector(".input-area");
    if (!inputArea) {
      inputArea = document.createElement("div");
      inputArea.classList.add("input-area");
      document.body.appendChild(inputArea);
    }
    const container = document.createElement("div");
    container.classList.add("system-input");
    const docfrag = document.createElement("input");
    const label = document.createElement("label");
    label.innerText = name;
    docfrag.type = "number";
    docfrag.name = name;
    docfrag.value = value;
    docfrag.onchange = onchange;
    container.appendChild(label);
    container.appendChild(docfrag);
    inputArea.appendChild(container);

    this.onchange = onchange;
    this.element = docfrag;
  }

  getValue() {
    return this.element.value;
  }

  setValue(value: any) {
    this.element.value = String(value);
    this.onchange();
  }
}
