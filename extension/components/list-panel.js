class ListPanel {
  constructor(parentEl) {
    this._parentEl = parentEl;
    this._parentViews = [];
    this._onClickPrevious = this._onClickPrevious.bind(this);
  }

  async update(header, items) {
    const sectionEl = document.createElement("section");

    if (header) {
      const { label, actionEl } = header;
      const headerEl = document.createElement("header");
      const previousEl = document.createElement("a");
      previousEl.classList.add("previous");
      const imgEl = document.createElement("img");
      imgEl.src = "images/arrowhead-left.svg";
      previousEl.appendChild(imgEl);
      previousEl.addEventListener("click", this._onClickPrevious);
      headerEl.appendChild(previousEl);

      const labelEl = document.createElement("label");
      labelEl.textContent = label;
      headerEl.appendChild(labelEl);

      if (actionEl) {
        headerEl.appendChild(actionEl);
      }

      sectionEl.appendChild(headerEl);
    }

    const ulEl = document.createElement("ul");
    for (const { className, dataset, onClick, icon, labels, hasChild } of items) {
      const liEl = document.createElement("li");
      const contentEl = document.createElement("a");
      contentEl.classList.add("content");
      contentEl.classList.add(className);

      if (icon) {
        const imgEl = document.createElement("img");
        imgEl.src = icon;
        contentEl.appendChild(imgEl);
      }

      for (const label of labels) {
        const labelEl = document.createElement("label");
        labelEl.textContent = label;
        contentEl.appendChild(labelEl);
      }

      if (hasChild) {
        const imgEl = document.createElement("img");
        imgEl.src = "images/arrowhead-right.svg";
        contentEl.appendChild(imgEl);
      }

      contentEl.addEventListener("click", () => onClick(dataset));
      liEl.appendChild(contentEl);
      ulEl.appendChild(liEl);
    }
    sectionEl.appendChild(ulEl);

    this._parentEl.appendChild(sectionEl);

    await this._animate(sectionEl,
                        { transform: ["translateX(100%)", "translateX(0%)"] },
                        { easing: "cubic-bezier(.07,.95,0,1)", duration: 50 });

    if (this._parentViews.length) {
      const parentView = this._parentViews[this._parentViews.length - 1];
      parentView.style.visibility = "hidden";
    }

    this._parentViews.push(sectionEl);
  }

  async _onClickPrevious() {
    const currentView = this._parentViews.pop();
    const parentView = this._parentViews[this._parentViews.length - 1];
    parentView.style.visibility = "unset";
    await this._animate(currentView,
                        { transform: ["translateX(0%)", "translateX(100%)"] },
                        { easing: "cubic-bezier(.07,.95,0,1)", duration: 50 });
    currentView.remove();
  }

  async _animate(element, keyframes, effect) {
    const animation = element.animate(keyframes, effect);
    await animation.finished;
  }
}
