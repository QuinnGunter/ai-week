//
//  actionsheet.js
//  mmhmm
//
//  Created by Steve White on 8/27/21.
//  Copyright © 2021 mmhmm, inc. All rights reserved.
//

class ActionSheet extends EventTarget {
    constructor(title, contents, width, scrollable, closable, offset = [0, 0], className = "") {
        super();

        this.legacySheet = true;

        var sheet = document.createElement("div");
        sheet.className = "sheet";
        sheet.style.marginLeft = offset[0] + "px";
        sheet.style.marginTop = offset[1] + "px";
        className && sheet.classList.add(className);
        if (width != null) {
            if (typeof width == "number") {
                sheet.style.width = width + "px";
            }
            else {
                sheet.style.width = width;
            }
        }

        if (closable == null) {
            closable = true;
        }

        if (title != null) {
            var titlebar = document.createElement("div");
            titlebar.style.display = "flex";
            titlebar.className = "titlebar";
            sheet.appendChild(titlebar);
            this.titlebar = titlebar;

            var titleElem = document.createElement("div");
            titleElem.className = "title";
            titleElem.innerText = title;
            titleElem.style.flexGrow = "1";
            titlebar.appendChild(titleElem);

            if (closable == true) {
                var closeButton = document.createElement("button");
                closeButton.title = LocalizedString("Close");

                var closeImage = AppIcons.Close();
                closeButton.appendChild(closeImage);
                titlebar.appendChild(closeButton);
                closeButton.addEventListener("click", evt => {
                    this.dismiss();
                });
                this.closeButton = closeButton;
            }
        }

        var container = document.createElement("div");
        container.className = "contents";
        if (title == null) {
            container.className += " no_title";
        }
        if (scrollable != true) {
            container.className += " no_scroll";
        }
        sheet.appendChild(container);
        container.appendChild(contents);
        this.container = container;
        this.contents = contents;

        this.listener = (evt) => {
            if (evt.target != sheet) {
                return;
            }
            if (evt.propertyName != "transform") {
                return;
            }
            this.onTransitionEnd(evt);
        }
        sheet.addEventListener("transitionend", this.listener);
        this.sheet = sheet;
        this.closable = closable;

        var clickListenerEvent = null;
        var clickEndEvent = null;
        if (navigator.userAgent.indexOf("Windows") == -1 && navigator.maxTouchPoints > 0) {
            clickListenerEvent = "touchstart";
            clickEndEvent = "touchend";
        }
        else {
            clickListenerEvent = "mousedown";
            clickEndEvent = "click";
        }
        this.clickListenerEvent = clickListenerEvent;
        this.clickListener = (evt) => {
            if (this.visible == false) {
                return;
            }

            var sheet = this.sheet;
            var src = evt.srcElement;
            if (IsDescendentOf(src, sheet) == true) {
                // The event was in our sheet, and we don't want
                // that to cause a dismissal
                return;
            }

            // We may have multiple sheets visible at the same time,
            // e.g. due to a menu showing a submenu
            // Both parent and child menus are getting click events
            // And the old intersection test would only succeed on one,
            // but failing on the other would cause both to dismiss
            // So if the source was inside a sheet, discard this event
            // entirely
            var test = src;
            while (test != null) {
                if (test.classList.contains("menu") == true) {
                    return;
                }
                test = test.parentElement;
            }

            var opts = {
                once : true,
                capture: true
            };

            window.addEventListener(clickEndEvent, endEvent => {
                endEvent.stopPropagation();
                this.dismiss();
            }, opts);
        };
    }

    /**
     * Set this sheet to dismiss itself when the hybrid app's main window is hidden
     * or when the hybrid app is asked to change. This should generally be the case
     * for any sheet that doesn't hold important state.
     */
    setAllowAutoDismiss() {
        this.setDismissOnWindowHidden();
    }

    /**
     * Set this sheet to dismiss itself when the hybrid app's main window is hidden.
     */
    setDismissOnWindowHidden() {
        if (this.dismissOnWindowHidden !== true) {
            this.dismissOnWindowHidden = true;
            NotificationCenter.default.addObserver(App.Notifications.HybridAppWindowHidden,
                null, this.onAppWindowHidden, this);
        }
    }

    onAppWindowHidden() {
        if (this.dismissOnWindowHidden == true) {
            this.dismiss(true);
        }
    }

    dispatchEvent(event) {
        super.dispatchEvent(event);
        // For some legacy compatibility reasons, if
        // we have a dismissed method, invoke it.
        // Its not clear where the subclasses that
        // implemented this could add and remove
        // event listeners.
        if (event != null && event.type == "dismissed") {
            if (this.dismissed != null) {
                this.dismissed();
            }
        }
    }

    get _titlebarTitleElement() {
        return this.titlebar.querySelector(".title");
    }
    get titlebarTitle() {
        return this._titlebarTitleElement.innerText;
    }
    set titlebarTitle(aTitle) {
        this._titlebarTitleElement.innerText = aTitle;
    }
    startClickListener() {
        this.stopClickListener();
        if (this.closable == false) {
            return;
        }
        window.addEventListener(this.clickListenerEvent, this.clickListener);
    }
    stopClickListener() {
        if (this.closable == false) {
            return;
        }
        window.removeEventListener(this.clickListenerEvent, this.clickListener);
    }
    onTransitionEnd(event) {
        var transitionTimeout = this.transitionTimeout;
        if (transitionTimeout != null) {
            window.clearTimeout(transitionTimeout);
            this.transitionTimeout = null;
        }

        var sheet = this.sheet;
        if (sheet.style.transition != "unset") {
            sheet.style.transition = "";
        }
        if (this.visible == true) {
            this.startClickListener();
        }
        else {
            this.stopClickListener();
            this.dispatchEvent(new Event("dismissed"));

            var parent = sheet.parentNode;
            if (parent != null) {
                parent.removeChild(sheet);
            }
        }
    }
    _boxForSheetWithTarget(sheet, target, event) {
        var result = {};

        if (sheet.style.width == "" || sheet.style.width == null) {
            result.left = 0;
            result.right = 0;
        }
        else {
            var sheetBox = sheet.getBoundingClientRect();

            if (event != null) {
                result.left = event.clientX;

                let horizontalMirror = false;
                if (event.clientX + sheetBox.width > window.innerWidth) {
                    horizontalMirror = true;
                }

                if (horizontalMirror || event.horizontalMirror == true) {
                    result.left -= sheetBox.width;
                    if (result.left < 0) {
                        result.left = 0;
                    }
                }

                result.top = event.clientY;
                if (result.top + sheetBox.height > window.innerHeight) {
                    result.top = window.innerHeight - sheetBox.height;
                    if (result.top < 0) {
                        result.top = 0;
                    }
                }

                var horizontal = event.horizontal;
                var vertical = event.vertical;
                if (horizontal != null && vertical != null) {
                    var transforms = [];
                    switch (horizontal) {
                        case "left":
                            result.left = "0px";
                            break;
                        case "center":
                            result.left = "50%";
                            transforms.push("translateX(-50%)");
                            break;
                        case "right":
                            result.right = "0px";
                            break;
                    }

                    let offset = 0;
                    if (event.verticalOffset) {
                        offset = event.verticalOffset;
                    }
                    switch (vertical) {
                        case "top":
                            result.top = `${offset}px`;
                            break;
                        case "center":
                            result.top = "50%";
                            transforms.push("translateY(-50%)");
                            break;
                        case "bottom":
                            result.bottom = `${offset}px`;
                            break;
                    }
                    result.transition = "unset";

                    if (transforms.length > 0) {
                        result.transform = transforms.join(" ");
                    }
                }
            }
            else {
                var windowWidth = window.innerWidth;

                var targetBox = target.getBoundingClientRect();
                if (targetBox.x < windowWidth / 2) {
                    // left aligned
                    var left = targetBox.x;
                    if (sheetBox.width < targetBox.width) {
                        left += (targetBox.width - sheetBox.width) / 2.0;
                    }
                    if (left + sheetBox.width > windowWidth) {
                        left = windowWidth - sheetBox.width;
                    }
                    result.left = left;

                }
                else {
                    // right aligned
                    var right = windowWidth - (targetBox.x + targetBox.width);
                    if (sheetBox.width < targetBox.width) {
                        right += (targetBox.width - sheetBox.width) / 2.0;
                    }
                    if ((windowWidth - right) - sheetBox.width < 0) {
                        right = 0;
                    }
                    result.right = right;
                }
            }
        }
        return result;
    }
    displayFrom(target, event = null) {
        this.visible = true;
        if (target != null && IsKindOf(target, AppToolbarButton)) {
            target = target.container;
        }

        var sheet = this.sheet;
        document.body.appendChild(sheet);
        this.dispatchEvent(new Event("willAppear"));

        var contents = this.container;
        if (contents != null) {
            contents.style.maxHeight = "";
            contents.style.setProperty("--sheet-max-height", "");
        }

        var controls = document.getElementById("bottom_bar");
        var header = NavigationBar.shared.container;
        var parent = target;
        while (parent != null) {
            if (parent == controls || parent == header) {
                break;
            }
            parent = parent.parentNode;
        }

        var box = this._boxForSheetWithTarget(sheet, target, event);
        for (var key in box) {
            var val = box[key];
            if (IsKindOf(val, Number) == true) {
                val = val + "px";
            }
            sheet.style[key] = val;
        }

        var maxHeight = window.innerHeight;
        var zIndex = 8;
        var isSpaceConstrained = false;
        //var isSpaceConstrained = (window.innerHeight < 500 && navigator.maxTouchPoints > 0);

        if ((box.left != null || box.right != null) &&
            (box.top != null || box.bottom != null) &&
            box.transform != null)
        {
            // Nothing to do, the box layout did it for us
            maxHeight = "100vh";
        }
        else if (parent == null) {
            // The target isn't in our header or toolbar...
            if (box.top != null) {
                maxHeight -= box.top;
                sheet.style.top = `${box.top}px`;
            }
            else if (box.bottom != null) {
                maxHeight = box.bottom;
                sheet.style.bottom = `${box.bottom}px`;
            }
            else {
                const bbox = target.getBoundingClientRect();
                var midY = bbox.y + (bbox.height / 2);
                if (midY < window.innerHeight / 2) {
                    sheet.style.top = midY + "px";
                    maxHeight -= midY;
                }
                else {
                    var bottomDistance = window.innerHeight - (bbox.bottom-bbox.height);
                    sheet.style.bottom = bottomDistance + "px";
                }
            }

            zIndex = GetWindowMaxZIndex(target);

            // XXX: we don't have a transition, so we need to
            // manually do things:
            window.setTimeout(evt => {
                this.startClickListener();
            }, 100);
        }
        else {
            var offsetY = 0;
            if (parent == controls) {
                offsetY = window.innerHeight;
                if (isSpaceConstrained == false) {
                    offsetY -= parent.getBoundingClientRect().y;
                }
            }
            else { // parent == header
                if (isSpaceConstrained == false) {
                    offsetY = parent.clientHeight;
                }
                else {
                    const bbox = parent.getBoundingClientRect();
                    offsetY = bbox.bottom;
                }
            }

            maxHeight -= offsetY;

            if (parent == header) {
                sheet.style.top = offsetY + "px";
                sheet.style.transform = 'translateY(0px)';
            }
            else {
                sheet.style.bottom = offsetY + "px";
                sheet.style.transform = 'translateY(-10px)';
            }

            var parentZ = parseInt(window.getComputedStyle(parent).zIndex);
            if (parentZ != null && isNaN(parentZ) == false) {
                zIndex = parentZ;

                if (isSpaceConstrained == false) {
                    zIndex -= 1;
                }
                else {
                    zIndex += 1;
                }
            }
        }

        sheet.style.opacity = 1
        sheet.style.zIndex = zIndex;

        if (contents != null) {
            if (IsKindOf(maxHeight, Number) == true) {
                if (this.legacySheet == true &&
                    header != null &&
                    isSpaceConstrained == false)
                {
                    maxHeight -= header.clientHeight;
                }

                if (maxHeight > 0) {
                    maxHeight = maxHeight + "px";
                }
                else {
                    maxHeight = null;
                }
            }

            if (maxHeight != null) {
                contents.style.maxHeight = maxHeight;
                contents.style.setProperty("--sheet-max-height", maxHeight);
            }
        }

        var elements = null;
        if (target != null && target.nodeType == Node.ELEMENT_NODE) {
            elements = target.getElementsByTagName("svg");
        }
        if (elements != null && elements.length >= 0) {
            for (var elementIdx = 0; elementIdx < elements.length; elementIdx += 1) {
                var svg = elements[elementIdx];
                var className = svg.getAttributeNS(null, "class");
                if (className != null && className.indexOf("disclosure") != -1) {
                    svg.setAttribute("style", "transform: rotate(0.5turn)");
                    this.svg = svg;
                    break;
                }
            }
        }

        if (box.transition == "unset") {
            this.onTransitionEnd();
        }

        if (target != null) {
            var onTargetRemoved = evt => {
                this.dismiss(true);
            };

            const observer = OnRemovedFromDocument(target, onTargetRemoved);
            this.addEventListener("beforeDismiss", () => {
                observer.disconnect();
            }, {once: true});
        }
    }
    destroy() {
        if (this.dismissOnWindowHidden) {
            NotificationCenter.default.removeObserver(App.Notifications.HybridAppWindowHidden,
                null, this.onAppWindowHidden, this);
            this.dismissOnWindowHidden = false;
        }
    }
    // XXX: To add in legacy migration...
    set onDismiss(block) {
        if (block != null) {
            this.addEventListener("dismiss", block, {once: true});
        }
    }
    get onDismiss() {
        return null;
    }
    dismiss(skipAnimation, detail) {
        this.visible = false;

        this.dispatchEvent(new Event("beforeDismiss"));

        var svg = this.svg;
        if (svg != null) {
            svg.setAttribute("style", "transform: rotate(0turn)");
            this.svg = null;
        }

        var sheet = this.sheet;
        if (sheet != null) {
            var transform = sheet.style.transform;
            var transition = sheet.style.transition;
            if (transform == "" || transition == "unset") {
                skipAnimation = true;
            }

            if (skipAnimation == true) {
                this.onTransitionEnd();
            }
            else {
                // The transitionEnd event may not fire, e.g.
                // because we're navigating to another page simultaneously
                // to dismissing the sheet.  If the person then navigates
                // back, the browser may just render the page that was previously
                // loaded, instead of re-loading the page from scratch
                // In that case, this timeout does fire, and we can remove
                // the sheet that is probably invisible.
                if (this.transitionTimeout == null) {
                    this.transitionTimeout = window.setTimeout(() => {
                        if (sheet.style.transform != "") {
                            this.onTransitionEnd();
                        }
                    }, 500);
                }
                if (sheet.style.top != "") {
                    sheet.style.transform = "translate(0px, " + -10 + "px)";
                }
                else { // presumably presented from the bottom
                    sheet.style.transform = "translate(0px, " + 10 + "px)";
                }
                sheet.style.opacity = 0
            }
        }
        this.dispatchEvent(new CustomEvent("dismiss", { detail }));
        this.destroy();
    }
    displayAsModal(onBackgroundClick = null) {
        var sheet = this.sheet;
        var style = sheet.style;
        var zIndex = GetWindowMaxZIndex();

        Object.assign(sheet.style, {
            transform: "scale(var(--scale))",
            transition: "opacity 0.404s ease-in-out, transform 0.404s ease-in-out",
            zIndex: zIndex + 1,
        })

        sheet.removeEventListener("transitionend", this.listener);

        var dismissOverlay = ShowFullPageOverlay(sheet, onBackgroundClick);
        this.origDismiss = this.dismiss;
        this.dismiss = (skipAnimation, detail) => {
            dismissOverlay();
            this.dispatchEvent(new CustomEvent("dismiss", { detail }));

            this.dismiss = this.origDismiss;
            sheet.addEventListener("transitionend", this.listener);
            this.destroy();
        }
    }
}

function UpdateStyledSliderFillAmount(slider) {
    var min = parseFloat(slider.min);
    var max = parseFloat(slider.max);
    var val = parseFloat(slider.value);

    var fill = (val - min) / (max - min);
    slider.style.setProperty("--fillAmount", (fill * 100) + "%")
}

class CollapsibleActionSheet extends ActionSheet {
    constructor(title, contents, width, scrollable, className = "") {
        super(title, contents, width, scrollable, false, [0, 0], className);

        var collapseIcon = AppIcons.SheetCollapse();
        this.collapseIcon = collapseIcon;

        var collapseButton = document.createElement("button");
        collapseButton.style.margin = "0px";
        collapseButton.title = LocalizedString("Collapse");
        collapseButton.appendChild(collapseIcon);
        collapseButton.addEventListener("click", evt => {
            this.toggleExpandCollapse();
        })
        this.collapseButton = collapseButton;

        var titlebar = this.titlebar;
        titlebar.insertBefore(collapseButton, titlebar.childNodes[0]);

        this.sheetTransition = "transform 0.33s ease-in";
    }
    toggleExpandCollapse() {
        var expanded = this.expanded;
        expanded = !expanded;
        this.expanded = expanded;

        var sheet = this.sheet;
        var collapsedOverlay = this.collapsedOverlay;
        if (expanded == true) {
            if (collapsedOverlay != null) {
                collapsedOverlay.parentNode.removeChild(collapsedOverlay);
                this.collapsedOverlay = null;
            }
        }
        else {
            if (collapsedOverlay == null) {
                collapsedOverlay = document.createElement("div");
                collapsedOverlay.style.position = "absolute";
                collapsedOverlay.style.top = "0px";
                collapsedOverlay.style.left = "0px";
                collapsedOverlay.style.bottom = "0px";
                collapsedOverlay.style.right = "0px";
                collapsedOverlay.addEventListener("click", evt => {
                    this.toggleExpandCollapse();
                }, {once: true})
                sheet.appendChild(collapsedOverlay);
                this.collapsedOverlay = collapsedOverlay;
            }
        }

        var button = this.collapseButton;
        var icon = this.collapseIcon;

        var sheetBbox = sheet.getBoundingClientRect();
        var buttonBbox = button.getBoundingClientRect();
        var edge = buttonBbox.right - sheetBbox.left;

        var tX = 0;
        if (expanded == true) {
            tX = sheet.clientWidth;
            button.title = LocalizedString("Collapse");
        }
        else {
            tX = edge;
            button.title = LocalizedString("Expand");
        }

        var rotation = 0;
        if (sheet.style.right != "") {
            rotation = (expanded ? 0 : 0.5);
            tX = -tX;
        }
        else {
            rotation = (expanded ? 0.5 : 0);
        }

        sheet.style.transform = `translate(${tX}px, 0px)`;
        sheet.style.transition = this.sheetTransition;

        icon.setAttribute("style", `transform: rotate(${rotation}turn)`);
    }
    onTransitionEnd(event) {
        this._stopTransitionTimer();
        super.onTransitionEnd(event);
    }
    _stopTransitionTimer() {
        if (this.transitionTimer != null) {
            window.clearTimeout(this.transitionTimer);
            this.transitionTimer = null;
        }
    }
    _startTransitionTimer() {
        this._stopTransitionTimer();
        this.transitionTimer = window.setTimeout(() => {
            this.onTransitionEnd();
        }, 100);
    }
    dismiss(skipAnimation) {
        this.visible = false;

        var resizeObserver = this.resizeObserver;
        if (resizeObserver != null) {
            resizeObserver.disconnect();
            this.resizeObserver = null;
        }

        this.dispatchEvent(new Event("beforeDismiss"));

        var sheet = this.sheet;
        if (sheet != null) {
            if (sheet.transform == "") {
                skipAnimation = true;
            }

            if (skipAnimation == true) {
                this.onTransitionEnd();
            }
            else {
                sheet.style.transition = this.sheetTransition;
                sheet.style.transform = `translate(0px, 0px)`;
                this._startTransitionTimer();
            }
        }

        this.dispatchEvent(new Event("dismiss"));
        this.destroy();
    }
}

class ActionSheetSlider extends ActionSheet {
    constructor(min, max, current, onChange) {
        var wrapper = document.createElement("div");

        super(null, wrapper, 22, false);

        wrapper.className = "slider_wrapper vertical";
        wrapper.style.paddingLeft = "3px";
        wrapper.style.paddingTop = "8px";
        wrapper.style.paddingBottom = "8px";
        wrapper.style.marginBottom = "16px";

        var slider = document.createElement("input");
        wrapper.appendChild(slider);

        slider.type = "range";
        slider.min = min;
        slider.max = max;
        slider.value = current;

        slider.addEventListener("input", evt => {
            this.updateSliderFillAmount();
            onChange(this, evt);
        });
        this.slider = slider;
        this.updateSliderFillAmount()
    }
    set sliderValue(aSliderValue) {
        this.slider.value = aSliderValue;
        this.updateSliderFillAmount();
    }
    get sliderValue() {
        return parseInt(this.slider.value);
    }
    updateSliderFillAmount() {
        var slider = this.slider;
        UpdateStyledSliderFillAmount(slider);
    }
}

class ActionSheetOptionList {
    constructor(name, onChange) {
        this.name = name;
        this.container = document.createElement("div");
        this.container.className = "option_list";
        this.onChange = onChange;
    }
    get checkmarkImage() {
        var checkmarkImage = this._checkmarkImage;
        if (checkmarkImage == null) {
            checkmarkImage = AppIcons.Checkmark();
            this._checkmarkImage = checkmarkImage;
        }
        return checkmarkImage;
    }
    getAllOptions() {
        return Array.from(this.container.childNodes);
    }
    removeAllOptions() {
        this.getAllOptions().forEach(option => {
            var parent = option.parentNode;
            if (parent != null) {
                parent.removeChild(option);
            }
        })
    }
    set selectedOption(identifier) {
        var option = this.container.querySelector("input[name='" + this.name + "'][type=radio][id='" + identifier + "']");
        if (option != null) {
            option.checked = true;
        }
    }
    get selectedOption() {
        var option = this.container.querySelector("input[name='" + this.name + "'][type=radio]:checked");
        if (option == null) {
            return null;
        }
        return option.id;
    }
    rowForOption(optionID) {
        var option = this.container.querySelector("input[name='" + this.name + "'][type=radio][id='" + optionID + "']");
        if (option == null) {
            return null;
        }
        return FirstAncestorWithTagName(option, "div");
    }
    addRow(row) {
        this.container.appendChild(row);
    }
    addRowBeneath(row, sibling) {
        var container = this.container;
        var children = Array.from(container.childNodes);
        var index = children.indexOf(sibling);
        if (index == -1 || index + 1 >= children.length) {
            this.addRow(row);
        }
        else {
            container.insertBefore(row, children[index + 1]);
        }
    }
    addHeader(text) {
        var header = document.createElement("div");
        header.className = "header";
        header.innerText = text;
        this.container.appendChild(header);
        return header;
    }
    addCheckbox(identifier, title, thumbnail, onChange) {
        return this.addOption("checkbox", identifier, title, thumbnail, false, onChange);
    }
    addRadioButton(identifier, title, thumbnail) {
        return this.addOption("radio", identifier, title, thumbnail);
    }
    addOption(type, identifier, title, thumbnail, divider, onChange) {
        var row = document.createElement("div");
        row.className = "row";
        this.container.appendChild(row);

        if (divider == true) {
            row.classList.add('with_divider')
        }

        var button = null

        var clickEventName = null;
        if (type == "button") {
            button = document.createElement("button");
            button.innerText = title;
            clickEventName = "click";
            row.appendChild(button);
            AddClassNameToElement("button", row);
        }
        else {
            button = document.createElement("input");
            button.id = identifier;
            button.type = type;
            button.value = identifier;
            button.name = this.name;

            if (type != "range") {
                var selected = document.createElement("span");
                selected.className = "selection_state";
                row.appendChild(selected);

                selected.appendChild(button);
                selected.appendChild(this.checkmarkImage.cloneNode(true));
                clickEventName = "change";
                row.addEventListener("click", evt => {
                    var path = [];
                    var element = evt.srcElement;
                    while (element != row) {
                        path.push(element);
                        element = element.parentNode;
                    }
                    path.push(row);

                    path = path.map(elem => elem.tagName);
                    if (path.indexOf("LABEL") == -1 && path.indexOf("INPUT") == -1) {
                        evt.preventDefault();
                        button.click();
                    }
                });
            }
            else {
                button.style.width = "100%";
                clickEventName = "input";

                var wrapper = document.createElement("div");
                wrapper.className = "slider_wrapper";
                wrapper.appendChild(button);
                row.appendChild(wrapper);
            }
        }

        button.addEventListener(clickEventName, event => {
            var src = event.srcElement;
            while (src != null && src != button) {
                var tag = src.tagName;
                if (tag == "BUTTON" || tag == "INPUT") {
                    return;
                }
                src = src.parentNode;
            }
            if (onChange != null) {
                onChange(event);
            }
            else {
                this.onChange(event);
            }
        });

        if (thumbnail != null) {
            var elem = null;
            if (typeof thumbnail != 'string') {
                thumbnail.setAttribute("class", "thumbnail");
                elem = thumbnail;
            }
            else {
                if (thumbnail.startsWith("data:image/") == false) {
                    thumbnail = "assets/icons/" + thumbnail;
                }
                var image = new Image();
                image.src = thumbnail;
                image.className = "thumbnail";
                elem = image;
            }
            row.appendChild(elem);
            elem.addEventListener("click", evt => {
                var fakeEvent = {
                    target: button
                }
                var action = (onChange != null ? onChange : this.onChange);
                action(fakeEvent);
            });
        }

        if (type != "button") {
            var label = document.createElement("label");
            label.innerText = title;
            label.setAttribute("for", identifier);
            row.appendChild(label);
        }
        return button;
    }
}
