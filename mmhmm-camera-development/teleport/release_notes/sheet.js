//
//  sheet.js
//  mmhmm
//
//  Created by Justin Juno on 05/01/23.
//  Copyright © 2023 mmhmm, inc. All rights reserved.
//

class ReleaseNotesSheet extends ActionSheet {

    /**
     * @param {LooksSidebarPane} looksPane
     */
    constructor(looksPane) {
        var container = document.createElement("div");
        super(
            LocalizedString("Release notes"),
            container,
            600,
            true,
            true,
            [0, 0],
            "release_notes_sheet"
        );

        this.looksPane = looksPane;
        this.setAllowAutoDismiss();

        this.populateContainer(container);
        this.container = container;
    }
    populateContainer(container) {
        container.classList.add("textfield_dialog");

        var latest = ReleaseNotes.getLatestKey();
        let releases = ReleaseNotes.getFilteredReleases();
        releases.forEach(release => {
            var isLatest = release.key == latest;
            var notesForRelease = this.createRelease(release, isLatest);
            container.appendChild(notesForRelease);
        });
    }
    createRelease(release, isLatestRelease) {
        let releaseContainer = document.createElement("div");
        releaseContainer.classList.add("release_container");

        if (release.title) {
            let titleWrapper = document.createElement("span");
            titleWrapper.classList.add("title_wrapper");

            let title = document.createElement("h2");
            title.innerText = release.title || FormatDate(release.key);
            titleWrapper.appendChild(title);

            if (isLatestRelease) {
                let badge = document.createElement("span");
                badge.innerText = LocalizedString("New");
                titleWrapper.appendChild(badge);
            }
            releaseContainer.appendChild(titleWrapper);
        } else {
            releaseContainer.classList.add("pt-6");
        }

        if (release.hero_image != null) {
            let img = document.createElement("img");
            img.src = release.hero_image;
            releaseContainer.appendChild(img);
        }

        let infoContainer = document.createElement("div");
        infoContainer.classList.add("info_container");
        releaseContainer.appendChild(infoContainer);

        release.info_array.forEach((info) => {
            if (info.columns) {
                // Two side-by-side columns of notes
                let columnContainer = document.createElement("div");
                columnContainer.classList.add("two-column");
                infoContainer.appendChild(columnContainer);

                this.addBlockToContainer(columnContainer, info.columns[0]);
                this.addBlockToContainer(columnContainer, info.columns[1]);
            } else {
                // One full-width column of notes
                this.addBlockToContainer(infoContainer, info);
            }
        });

        if (release.list) {
            this.addBulletedList(releaseContainer, release.list);
        }

        if (isLatestRelease) {
            this.addFooter(releaseContainer, release);
        }

        return releaseContainer;
    }

    addBlockToContainer(container, info) {
        let infoWrapper = document.createElement("div");
        infoWrapper.classList.add("info_wrapper");
        container.appendChild(infoWrapper);

        if (info.thumbs) {
            let thumbnails = document.createElement("div");
            thumbnails.classList.add("info_thumbnails");
            if (info.thumbs.length == 1) {
                thumbnails.classList.add("single");
            }

            info.thumbs.forEach((image) => {
                let img = document.createElement("img");
                img.src = image;
                thumbnails.appendChild(img);
            });

            infoWrapper.appendChild(thumbnails);
        }

        if (info.heading) {
            let heading = document.createElement("h3");
            heading.innerText = info.heading;
            infoWrapper.appendChild(heading);
        }

        if (info.description) {
            let content = info.description;
            if (content instanceof Function) {
                content = content();
            }
            let description = document.createElement("p");
            description.innerText = content;
            infoWrapper.appendChild(description);
        }

        if (info.link) {
            let link = document.createElement("a");
            link.classList.add("info_link");
            link.href = info.link;
            link.target = "_blank";
            link.innerText = LocalizedString("Learn more");
            infoWrapper.appendChild(link);
        }
    }

    addBulletedList(releaseContainer, listInput) {
        let listTitle = document.createElement("h4");
        listTitle.innerText = listInput.heading;
        releaseContainer.appendChild(listTitle);

        let list = document.createElement("ul");
        releaseContainer.appendChild(list);

        listInput.items.forEach((item) => {
            let li = document.createElement("li");
            li.innerText = item;
            list.appendChild(li);
        });
    }

    addFooter(releaseContainer, release) {
        const cta = release.callToAction;
        if (!cta) {
            return;
        }

        let learnContainer = document.createElement("div");
        learnContainer.classList.add("learn_container");
        releaseContainer.appendChild(learnContainer);

        if (cta.message) {
            let learnMore = document.createElement("span");
            learnMore.innerText = cta.message;
            learnContainer.appendChild(learnMore);
        }

        let toursCTA = document.createElement("button");
        toursCTA.classList.add("capsule");
        toursCTA.innerText = cta.buttonText;
        toursCTA.addEventListener("click", _ => cta.actionHandler(this));
        learnContainer.appendChild(toursCTA);
    }

    displayAsModal() {
        super.displayAsModal();

        // Track that the user has seen this version
        SharedUserDefaults.setValueForKey(ReleaseNotes.getLatestKey(), "lastReleaseNotes");
    }
}
