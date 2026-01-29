//
//  menu.js
//  mmhmm
//
//  Created by Steve White on 9/13/22.
//  Copyright © 2022 mmhmm, inc. All rights reserved.
//

class Menu extends ActionSheet {
    constructor(offset = [0, 0]) {
        var list = new ActionSheetOptionList("menu");
        var container = list.container;
        container.classList.add("menu");
        super(null, container, "fit-content", false, true, offset, 'visual-select-sheet')
        this.list = list;
        this.menuItems = [];
        this.legacySheet = false;
        this.setAllowAutoDismiss();
    }
    addItem(title, action, destructive = false, isDisabled = false) {
        var button = this.list.addOption("button", 0, title, null, false, (event) => {
            this.dismiss();
            action(event);
        });
        if (destructive == true) {
            button.style.color = 'var(--action-destructive)';
        }
        if (isDisabled == true) {
            button.disabled = true;
        }
        this.menuItems.push(button);
        return button;
    }
    addLinkItem(title, icon, url, analyticsEvent, analyticsArgs) {
        if (url == null) {
            console.error("Cannot add item without a url");
            return;
        }

        var button = this.addItem(title, (evt) => {
            if (url.constructor == String || url.constructor == URL) {
                window.open(url, "_blank");
                if (analyticsEvent != null) {
                    Analytics.Log(analyticsEvent, analyticsArgs);
                }
            }
            else if (url.constructor == Promise) {
                url.then(resolved => {
                    window.open(resolved, "_blank");
                    if (analyticsEvent != null) {
                        Analytics.Log(analyticsEvent, analyticsArgs);
                    }
                })
            }
        });

        if (icon != null) {
            var wrapper = document.createElement("span");
            wrapper.className = "icon";
            wrapper.appendChild(icon);
            button.insertBefore(wrapper, button.childNodes[0]);
        }
        return button;
    }
    addCheckbox(title, action, icon, left = true) {
        // left controls whether we put the checkbox on the left or right of the label
        const checkbox = this.list.addCheckbox(createUUID(), title, icon, action);
        if (left) {
            this.itemsNeedIndentation = true;
        } else {
            const wrapper = checkbox.parentNode;
            const row = wrapper.parentNode;
            row.appendChild(wrapper);
            row.classList.add("checkbox-right");
        }
        return checkbox;
    }
    addLabel(title) {
        var label = document.createElement("div");
        label.classList.add("label");
        label.innerText = title;
        this.addCustomView(label);
    }
    addDivider() {
        var divider = document.createElement("div");
        divider.className = "row divider";
        this.addCustomView(divider);
    }
    addCustomView(view) {
        this.list.container.appendChild(view);
    }
    addSubmenu(title, icon, view=null) {
        var submenu = new Menu();

        var button = this.list.addOption("button", 0, title, null, false, () => {
            if (submenu.visible == true) {
                submenu.dismiss();
                return;
            }

            this.submenus.forEach(menu => {
                if (menu.visible == true) {
                    menu.dismiss();
                }
            })

            var sourceBox = button.getBoundingClientRect();
            var placement = {};
            placement.clientX = sourceBox.x;
            if (sourceBox.x + sourceBox.width + 300 > window.innerWidth) {
                placement.horizontalMirror = true;
            }
            else {
                placement.clientX += sourceBox.width;
            }
            placement.clientY = sourceBox.y;
            submenu.displayFrom(button, placement);
        });

        button.innerText = null;
        button.className = "title_plus_icon";

        if (view != null) {
            button.appendChild(view);
        }
        else {
            if (icon != null) {
                button.appendChild(icon);
            }

            var label = document.createElement("span");
            label.innerText = title;
            button.appendChild(label);
        }

        var submenuArrow = AppIcons.CaretRight();
        button.appendChild(submenuArrow)
        this.menuItems.push(button);

        var submenus = this.submenus;
        if (submenus == null) {
            submenus = [];
            this.submenus = submenus;
        }
        submenus.push(submenu);

        return submenu;
    }
    destroy() {
        if (this.keyboardObserverRegistered) {
            gApp.unregisterKeyboardObserver(this);
            this.keyboardObserverRegistered = false;
        }
        super.destroy();
        this.submenus?.forEach(menu => menu.destroy());
        NotificationCenter.default.postNotification(
            Menu.Notifications.WillHide,
            this,
            {}
        );
    }
    displayFrom(sender, event) {
        if (this.itemsNeedIndentation == true) {
            this.addIndentationToItems();
        }
        super.displayFrom(sender, event);
        if (!this.keyboardObserverRegistered) {
            gApp.registerKeyboardObserver(this);
            this.keyboardObserverRegistered = true;
        }
        NotificationCenter.default.postNotification(
            Menu.Notifications.WillShow,
            this,
            {}
        );
    }
    handleKeyboardEvent(event) {
        // Allow menus to be dismissed with the escape key
        if (this.visible && event.type == "keydown" && event.key == "Escape") {
            this.dismiss();
            event.preventDefault();
            event.stopPropagation();
            return true;
        }
        return false;
    }
    addIndentationToItems() {
        var list = this.list;
        list.getAllOptions().forEach(option => {
            if (option.classList.contains("button") == false) {
                return;
            }

            var selected = document.createElement("span");
            selected.className = "selection_state";
            selected.style.marginRight = "2px";

            var checkmark = list.checkmarkImage.cloneNode(true);
            selected.appendChild(checkmark)
            option.insertBefore(selected, option.childNodes[0]);
        })
    }
}
Menu.Notifications = Object.freeze({
    WillShow: "Menu.WillShow",
    WillHide: "Menu.WillHide"
});
