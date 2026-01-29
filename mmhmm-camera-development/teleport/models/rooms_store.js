//
//  rooms_store.js
//  mmhmm
//
//  Created by Steve White on 8/18/21.
//  Copyright © 2021 mmhmm, inc. All rights reserved.
//

class RoomsCategory extends ObservableObject {
    constructor(title, icon, identifier, rooms = []) {
        super();

        this.title = title;
        this.icon = icon;
        this.identifier = identifier;
        this.rooms = rooms;
        this.hidden = false;
    }
    set rooms(aListOfRooms) {
        this._rooms = Array.from(aListOfRooms ?? []);
    }
    get rooms() {
        return Array.from(this._rooms);
    }
    get roomCount() {
        return this._rooms.length;
    }

    addRoom(aRoom) {
        var rooms = this._rooms;
        if (rooms.indexOf(aRoom) == -1) {
            rooms.push(aRoom);
            this.didChangeValueForProperty(this.rooms, "rooms");
        }
    }

    addRooms(...aListOfRooms) {
        var rooms = this.rooms;
        var roomsToAdd = aListOfRooms.filter(room => rooms.indexOf(room) == -1);
        if (roomsToAdd.length > 0) {
            this._rooms = rooms.concat(roomsToAdd);
            this.didChangeValueForProperty(this.rooms, "rooms");
        }
    }

    removeRoom(aRoom) {
        var rooms = this._rooms;
        var index = rooms.indexOf(aRoom);
        if (index != -1) {
            rooms.splice(index, 1);
            this.didChangeValueForProperty(this.rooms, "rooms");
        }
    }

    containsRoom(aRoom) {
        return (this.rooms.indexOf(aRoom) != -1);
    }

    roomWithIdentifier(aRoomID) {
        if (aRoomID == null) {
            return null;
        }
        aRoomID = aRoomID.toLowerCase();
        return this.rooms.find(room => room.identifier == aRoomID);
    }

    roomWithFingerprint(fingerprint) {
        return this.rooms.find(room => room.asset?.fingerprint == fingerprint);
    }
}

class RoomsController extends ObservableObject {
    constructor() {
        super();

        this.automaticallyNotifiesObserversOfRooms = false;
        this.automaticallyNotifiesObserversOfCategories = false;

        this.populateRoomsAndCategories();
    }
    restore(cacheStore) {
        this.cacheStore = cacheStore;

        var ep = mmhmmAPI.defaultEndpoint();
        var tasks = [];

        if (ep.isAuthenticated == false) {
            // If we don't have a user id, there isn't a point
            // in restoring either of these
            cacheStore.setCustomRooms(null);
            cacheStore.setRoomCatalog(null);
        }
        else {
            var userID = ep.user.id;
            var custom = cacheStore.getCustomRooms().then(rooms => {
                if (rooms != null) {
                    var records = rooms.map(room => new CloudyRecord(room));
                    records = records.filter(record => record.ownerUserId = userID);
                    this.processCustomRooms(records, ep);
                }
            });
            tasks.push(custom);

            var catalog = cacheStore.getRoomCatalog().then(rooms => {
                if (rooms != null) {
                    this.processCatalogRooms(rooms, ep);
                }
            });
            tasks.push(catalog);
        }

        Promise.all(tasks).finally(() => {
            this.restoreRecentRooms();

            const stage = this.stage;
            if (stage != null && stage.room != this.airlockRoom) {
                this.restoreDefaultRoom();
            }

            // Safe to listen to notifications now..
            NotificationCenter.default.addObserver(
                mmhmmAPI.Notifications.AuthenticationChanged,
                null,
                () => this.authenticationChanged()
            );

            NotificationCenter.default.addObserver(
                RoomCatalogAsset.Notifications.Expired,
                null,
                this.roomCatalogAssetExpired,
                this
            );

            // The cached data may be stale, so
            // retrieve new data now.
            if (ep.isAuthenticated == true) {
                this.reloadCustomRooms(ep);
                this.reloadRoomCatalog(ep);
            }
        });
    }
    restoreDefaultRoom() {
        const stage = this.stage;
        if (stage == null) {
            return;
        }
        const room = this.defaultRoom;
        try {
            stage.room = room;
        } catch (e) {
            console.error("Error setting room", e);
        }
    }
    populateRoomsAndCategories() {
        const simple = new RoomsCategory(LocalizedString("Simple"), AppIcons.RoomCategorySimple(), "82666610-33e9-46a8-9b25-3ac201118929");
        this.simpleRooms = simple;

        const frames = new RoomsCategory(LocalizedString("Frames"), AppIcons.RoomCategoryFrames(), "8f40f56f-c184-499c-a746-fbf58d0fcc2d");
        this.frameRooms = frames;

        const serious = new RoomsCategory(LocalizedString("Serious"), AppIcons.RoomCategorySerious(), "96e9c749-a4a6-4d9d-9a79-b75560e27f47");
        const fun = new RoomsCategory(LocalizedString("Fun"), AppIcons.RoomCategoryFun(), "d8e6c260-03e3-40e3-8922-e65f4f52db51");
        const inspirational = new RoomsCategory(LocalizedString("Inspirational"), AppIcons.RoomCategoryInspirational(), "7fa3612b-a88f-4928-843d-427136e862ad");
        const abstract = new RoomsCategory(LocalizedString("Abstract"), AppIcons.RoomCategoryAbstract(), "b8da5c0d-1bdd-4a03-a489-e7c2035ed0c6");
        const colors = new RoomsCategory(LocalizedString("Color"), AppIcons.RoomCategoryColor(), "cba3c3bd-d32a-4354-98a2-babdd1f71fce");
        this.colorRooms = colors;

        const custom = new RoomsCategory(LocalizedString("Custom"), AppIcons.RoomCategoryCustom(), "74dd9370-4569-4fc5-b4c5-6b953daede74");
        this.customRooms = custom;

        const shared = new RoomsCategory(LocalizedString("Shared"), AppIcons.RoomCategoryCustom(), "5e5f6823-03bc-48f7-bbde-93b865f298aa");
        shared.hidden = true;
        this.sharedRooms = shared;

        this._categories = [ simple, serious, fun, inspirational, abstract, custom, colors, frames, shared ];

        if (App.isDemo) {
            // We want to be able to use CDN rooms even though we don't load the room catalog
            // We'll create them on demand and stash them in a special hidden category
            const cdnRooms = new RoomsCategory("CDN Rooms", AppIcons.RoomCategoryCustom(), "2c64658c-5f0a-4bfc-a3bb-3e0e55174af7");
            cdnRooms.hidden = true;
            this.cdnRooms = cdnRooms;
            this._categories.push(cdnRooms);
        }

        // A specific room that we switch to when you're on a call and haven't chosen a room
        const defaultCallRoom = new MediaRoom("772e39d0-d03c-4b19-85c4-95913c708de5", LocalizedString("Holodeck"), "holodeck-active.png", "holodeck-active.mp4", []);
        defaultCallRoom.restorable = false;
        this.defaultCallRoom = defaultCallRoom;

        //
        // Make the rooms
        //

        simple.addRooms(
            new MediaRoom("14c875b0-2a92-49b3-ada7-58b67db657ed", LocalizedString("Cosmic Glow"), "glow-bokeh_thumb.png", "glow-bokeh.png"),
            new MediaRoom("19005e7f-2de5-4e0d-892c-c0dcc81e4b24", LocalizedString("Spring Breeze"), "glow-bright_thumb.png", "glow-bright.png"),
            new MediaRoom("26f5d691-f743-4977-9436-0f2a8848dce8", LocalizedString("Deep Ocean"), "glow-horizon_thumb.png", "glow-horizon.png"),
            new MediaRoom("aa116d9c-30dc-450d-a329-45f5051cb2b1", LocalizedString("Nebula"), "glow-spot_thumb.png", "glow-spot.png"),
            new MediaRoom("7d0c3db8-1896-473a-95f4-b27c49c7788f", LocalizedString("Sunset"), "glow-sunset_thumb.png", "glow-sunset.png"),
            new MediaRoom("81d74ca5-fbdd-45b7-b901-49802223b2c8", LocalizedString("Heatwave"), "heatwave_thumb.png", "heatwave.png"),

            new MediaRoom("9a88118b-7666-4ee5-bd15-eac399a9af19", LocalizedString("Obsidian Mist"), "gradient-black_thumb.png", "gradient-black.png"),
            new MediaRoom("ccd65dc8-18f0-479c-8b6f-bdb8b04e77c5", LocalizedString("Blue Sky"), "gradient-blue_thumb.png", "gradient-blue.png"),
            new MediaRoom("078bc036-a6db-408e-8b2c-f789e67f5fe0", LocalizedString("Sandy Dusk"), "gradient-orange_thumb.png", "gradient-orange.png"),
            new MediaRoom("02582c8a-a4fd-4fa6-878c-fbcfadb976d8", LocalizedString("Silver Fog"), "gradient-white_thumb.png", "gradient-white.png"),
        );

        const solidBlackRoom = new SolidColorRoom("3af748e6-967d-4e63-9039-fa109d88ceda", LocalizedString("Black"), null, "#000000");
        colors.addRooms(...simple.rooms, solidBlackRoom);

        frames.addRooms(
            this.makeCDNRoom({ id: "72e30cc3-a5f8-42ec-90aa-34559368d3fd", title: "Driftwood", cdnID: "f8064c5aba715dddd842718792b24d3e076bb25f", extensions:  { thumb: "png", file: "png" }, }),
            this.makeCDNRoom({ id: "f989a127-3caa-4f41-9b36-b98bc00ed943", title: "Dune Waves", cdnID: "1db2bae5f20384117edfae30e31c2e519251d3a5", extensions:  { thumb: "png", file: "png" }, }),
            this.makeCDNRoom({ id: "45e02307-7c4e-4188-9582-67513d664f36", title: "Jungle", cdnID: "0c2f6c1c39ed2fba94a3881c55bb999a89a70aa6", extensions:  { thumb: "png", file: "png" }, }),
            this.makeCDNRoom({ id: "2588e557-5332-4264-98ea-9d477e4d339a", title: "Polar Prism", cdnID: "aaa6fffe82e54c102bff6d198f902a61dac7cef9", extensions:  { thumb: "png", file: "png" }, }),
            this.makeCDNRoom({ id: "21ad321e-0598-4ed2-b0ab-44126d5da595", title: "Ribbon Dance", cdnID: "9238577b8aeaa9df69b3ad5e9b93a4f0ae118485", extensions:  { thumb: "png", file: "png" }, }),
        );

        serious.addRooms(
            new MediaRoom("0ba09073-a868-486f-9081-5f616743d422", LocalizedString("Board Room"), "boardroom_thumb.png", "boardroom.png"),
            this.makeCDNRoom({ id: "139dba49-69cc-4347-b620-c60090b5cd96", title: "Morning Sun", cdnID: "940fdb6c0632143311f8d8ea901731281f0bdebc", size: "1920x1080", extensions:  { thumb: "png", file: "mp4" }, }),
            this.makeCDNRoom({ id: "4416c7e6-5d15-46e1-ace7-7a9b540fc5d6", title: "News Anchor", useVignetteFilter: false,  cdnID: "77c18183eb94879f79e6b777e6abeb2b22f4dd05", extensions:  { thumb: "jpg", file: "jpg" }, }),
            this.makeCDNRoom({ id: "2c99adea-33f0-499f-add4-adab4fd7c0ef", title: "Textured Walls", useVignetteFilter: false, cdnID: "7df3a1dd925dff507694afd7060b145a54ea5e26", extensions:  { thumb: "jpg", file: "jpg" }, }),
            this.makeCDNRoom({ id: "7b383c50-6f35-46d7-986f-f704b64afd86", title: "White Shelves", cdnID: "ed7a7b6989e3a34641b4810222db946135210446", extensions:  { thumb: "jpg", file: "jpg" }, }),
            new MediaRoom("9bef94a1-a4c0-4021-9eb6-dd16dc972df5", LocalizedString("Library"), "library-thumb.png", "library.png", []),
            this.makeCDNRoom({ id: "9f36c808-3f24-4897-9e68-fb9e05e06453", title: "Late Night", useVignetteFilter: false,  cdnID: "5e1169bc330b15dad8b0fa6a1d6659729082473e", extensions:  { thumb: "png", file: "mp4" }, }),
            this.makeCDNRoom({ id: "8a57c1fb-ee9b-413e-90b8-c2a058dd5bff", title: "Board Room Screen", useVignetteFilter: false, cdnID: "42f74ff71fd732a3f99db1d6db9d1f94135927e9", extensions:  { thumb: "png", file: "png" }, }),
        );

        fun.addRooms(
            this.makeCDNRoom({ id: "42afa401-8bb2-4647-808e-3f8b615792bb", title: "Cardboard Box", useVignetteFilter: false, cdnID: "e92b3c18ad9b953ffe22fd5a92087bc1abde1a90", extensions: { thumb: "jpg", file: "jpg"}}),
            this.makeCDNRoom({ id: "e3acebad-f022-4714-b05e-a4de6648f7a5", title: "Tulips", cdnID: "2aec2ea94b5f8d66cd4d15ef24a73edbb7f10394", extensions: { thumb: "png", file: "mov"}}),
        );
        if (!App.isDemo) {
            fun.addRooms(
                new CabinRoom(),
                new Room.Shader.Paperworld(),
                new OnsenMonkeyRoom(),
            );
        }

        inspirational.addRooms(
            this.makeCDNRoom({ id: "71fd69d7-e933-4532-bfb5-f590fc0cc895", title: "Autumnal Woods View", cdnID: "2be4116e20e622f29cc150be869d192db27edd05", extensions:  { thumb: "png", file: "mp4" }, }),
            this.makeCDNRoom({ id: "15bb5152-2a24-453a-ba16-2d2f2c030cbd", title: "Spring Blossoms View", cdnID: "527f94358dc1f06618ae7865e00164b25f6edb5a", extensions:  { thumb: "png", file: "mp4" }, }),
            this.makeCDNRoom({ id: "3d9488e4-44ca-4372-8b5d-ac599256f0e0", title: "Miami Nights", cdnID: "0a7ace5a1cfd6a0c263c7311f2fe84c4247c26d7", extensions:  { thumb: "png", file: "mp4" }, }),
            this.makeCDNRoom({ id: "57be9db0-17d9-43a7-90e8-d930e80f51b7", title: "Manhattan Reflection", cdnID: "b0d7b7cdf8a6247fce5db7bfb0f1c60db8bfc2d1", extensions:  { thumb: "png", file: "mp4" }, }),
            this.makeCDNRoom({ id: "f218f172-964e-471d-8a30-07a02d3ae851", title: "Japanese Fall Garden", cdnID: "2da391fbe5296c7794b6cbb74b923d43d7a128fa", extensions:  { thumb: "jpg", file: "jpg" }, }),
            this.makeCDNRoom({ id: "96a16526-f49f-423b-bf8d-72558cf698fe", title: "Woods", cdnID: "257347c2f4701b2b1c8ad19c2f8a8fe01ffe7228", size: "1920x1080", extensions:  { thumb: "png", file: "mp4" }, }),
        );
        if (!App.isDemo) {
            inspirational.addRooms(
                new SpaceRoom(),
                new CampfireRoom(),
            );
        }

        abstract.addRooms(
            new Room.Shader.Ripples(),
            new Room.Shader.Waves(),
            this.makeCDNRoom({ id: "f0a15995-0401-4e50-a558-219f9373422f", title: "Aquamarine Hex", cdnID: "7ec73ecb9129639ca4cb142e537e86bcb8222663", extensions:  { thumb: "png", file: "mp4" }, }),
            this.makeCDNRoom({ id: "a13b8ac7-9855-44de-813b-b852fa220bba", title: "Cerulean Circles", cdnID: "1962a12e627ae9189fa1ef5fa42e753f252eea45", extensions:  { thumb: "png", file: "mp4" }, }),
            this.makeCDNRoom({ id: "96fef443-9f11-4385-b7fc-fa12eefd5649", title: "Tequila Sunrise", cdnID: "530d671f93c6193b289fc73394756a82be3d6d1c", extensions:  { thumb: "png", file: "mp4" }, }),
            this.makeCDNRoom({ id: "2c0f584d-ed8d-441f-8182-382ed965289b", title: "Kaleidoscope Blur", cdnID: "143b68309972d5a0e1343a582d0900ad565577c5", extensions:  { thumb: "png", file: "mp4" }, }),
            this.makeCDNRoom({ id: "a3b0e68e-e669-4962-a5dc-4b073ccc7184", title: "Violet Refraction", cdnID: "1432117671611c4b2cfed94ea482e264975c0de1", size: "1920x1080", extensions:  { thumb: "png", file: "mp4" }, }),
            new Room.Shader.Hexagons(),
            this.makeCDNRoom({ id: "99f86eb3-3280-4b21-8508-52f5da05c8a0", title: "Bubbles", cdnID: "7d3d9dd93774dda657d84b4477471913a776147f", extensions: { thumb: "png", file: "png" } }),
            new MediaRoom("854ce9c3-282e-4251-9c26-7b1f8fd793ec", LocalizedString("Hex Grid"), "hex-grid_thumb.png", "hex-grid.png"),
            new MediaRoom("cd47a444-f9e3-4719-9135-dfc780c0c70a", LocalizedString("Hex Neon"), "hex-neon_thumb.png", "hex-neon.png"),
            defaultCallRoom,
        );

        const airlock = new MediaRoom("6169726c-6f63-6b61-6972-6c6f636b6169", "", "holodeck.png", "holodeck.png", []);
        airlock.restorable = false;
        this.airlockRoom = airlock;

        this.defaultRoom = solidBlackRoom;
    }

    get rooms() {
        return this.categories.flatMap(category => category.rooms);
    }
    roomWithIdentifier(id) {
        if (id == null) {
            return null;
        }
        id = id.toLowerCase();
        return this.rooms.find(aRoom => aRoom.identifier == id);
    }
    cdnRoomWithIdentifier({ id, cdnID, title, format = "jpg"}) {
        let room = this.roomWithIdentifier(id);

        // If we don't already have this room, make one and save it
        if (!room && cdnID) {
            room = this.makeCDNRoom({id, title, cdnID, extensions: { thumb: format, file: format }});
            this.cdnRooms?.addRoom(room);
        }

        return room;
    }
    // id: the UUID found in the item's Sanity URL
    //     https://mmhmm.sanity.studio/desk/all-rooms;71fd69d7-e933-4532-bfb5-f590fc0cc895
    // cdnID: the UUID found in the item's Sanity image asset URL
    //     https://cdn.sanity.io/images/abmcou2z/production/e92b3c18ad9b953ffe22fd5a92087bc1abde1a90-1920x1080.jpg
    //     For videos there's a mapping from video asset ID to image asset ID
    makeCDNRoom({id, title, cdnID, size, extensions}) {
        const thumbnailUrl = RoomsController.CDN.getThumbnailURL(cdnID, size, extensions.thumb);
        const contentUrl = RoomsController.CDN.getContentURL(cdnID, size, extensions.file);
        const room = new MediaRoom(id, title, thumbnailUrl, contentUrl);
        room.restorable = true;
        return room;
    }
    catalogRoomWithIdentifier(id) {
        var ep = mmhmmAPI.defaultEndpoint();
        var catalogRoom = ep.roomCatalogEntryWithID(id, true);
        if (catalogRoom == null) {
            return null;
        }

        // XXX: Would we need to upload this to the person's
        // custom rooms??
        return this.newCustomRoomFromCatalogEntry(catalogRoom);
    }
    customRoomWithIdentifierForScene(id) {
        // Studio scenes user a "room ID" that isn't the actual ID
        // of the Cloudy custom room record, so we hunt through our
        // custom room list and see if we can find this room

        var category = this.customRooms;
        if (category == null) {
            return null;
        }
        return category.rooms.find(room => room.identifierForScene == id);
    }
    doesRoomRequireImport(room) {
        if (IsKindOf(room, CustomRoom) == false) {
            return false;
        }
        return (room.model.presenterID != this.localPresenterID);
    }
    addRoom(aRoom) {
        this.customRooms.addRoom(aRoom);
        this.didChangeValueForProperty(null, "rooms");
    }
    /*
     * Make a room the currently active room.
     */
    async loadRoomIntoStage(room) {
        var stage = this.stage;
        if (stage.room != room) {
            var asset = room.asset;
            if (asset == null) {
                stage.room = room;
            }
            else {
                await asset.open();
                stage.room = room;
                asset.close();
            }
            Analytics.Log("presentation.room.changed", {room_id: room.identifier});
        }
        RoomsController.shared.addRoomToRecents(room);
    }
    /*
     * Recent rooms
     */
    get recentRooms() {
        var recentRooms = this._recentRooms;
        if (recentRooms == null) {
            return [];
        }
        // Return a copy since everything is mutable...
        return Array.from(recentRooms);
    }
    set recentRooms(list) {
        this.setRecentRooms(list, true);
    }
    setRecentRooms(list, persist = true) {
        if (list == null) {
            list = [];
        }

        // Store a copy since everything is mutable...
        var recents = Array.from(list);
        recents = recents.filter(obj => obj != null);

        var count = recents.length;
        var maxCount = RoomsController.MaxNumberOfRecents;
        if (count > maxCount) {
            // We only store <max>: remove the rest
            recents.splice(maxCount, count - maxCount);
            persist = true;
        }
        this._recentRooms = recents;

        if (persist == true) {
            var roomIDs = recents.map(room => room.identifier);
            SharedUserDefaults.setValueForKey(roomIDs, "recentRooms");
        }
    }
    restoreRecentRooms() {
        var roomIDs = SharedUserDefaults.getValueForKey("recentRooms", []);
        var recents = roomIDs.map(roomID => {
            var room = this.roomWithIdentifier(roomID);
            if (room == null) {
                console.log("Can't restore recent room with identifier " + roomID);
            }
            return room;
        });

        this.setRecentRooms(recents, false);
        this.didChangeValueForProperty(null, "recentRooms");
    }
    addRoomToRecents(room) {
        var recentRooms = this.recentRooms;
        var existing = recentRooms.indexOf(room);
        if (existing != -1) {
            recentRooms.splice(existing, 1);
        }
        recentRooms.unshift(room);
        this.recentRooms = recentRooms;
    }
    removeRoomFromRecents(room) {
        var recents = this.recentRooms;
        var existing = recents.indexOf(room);
        if (existing == -1) {
            return;
        }

        recents.splice(existing, 1);
        this.recentRooms = recents;
    }
    /*
     * Category helpers
     */
    get categories() {
        return Array.from(this._categories);
    }
    insertCategoryAtIndex(aCategory, index) {
        var categories = this._categories;
        if (categories.indexOf(aCategory) != -1) {
            return;
        }
        index = clamp(index, 0, categories.length);
        categories.splice(index, 0, aCategory);
        this.didChangeValueForProperty(null, "categories");
    }
    addCategory(aCategory) {
        return this.insertCategoryAtIndex(aCategory, this._categories.length);
    }
    removeCategory(aCategory) {
        var categories = this._categories;
        var index = categories.indexOf(aCategory);
        if (index != -1) {
            categories.splice(index, 1);
            this.didChangeValueForProperty(null, "categories");
        }
    }
    categoryWithTitle(title) {
        return this._categories.find(cat => cat.title == title);
    }
    categoryWithIdentifier(identifier) {
        return this._categories.find(cat => cat.identifier == identifier);
    }
    /*
     * Events
     */
    roomForEvent(event, sender) {
        if (event == null) {
            console.error("null event supplied");
            debugger;
            return;
        }

        const id = event.id;
        if (id == null) {
            return null;
        }

        // The room may be a public room which we should know of
        // Or it may be a custom room we've previously cached.
        let room = this.roomWithIdentifier(id);
        if (room != null) {
            return room;
        }

        if (event.type == SolidColorRoom.Type) {
            return SolidColorRoom.FromJSON(event, sender);
        }

        room = CustomRoom.FromTeleport(event, sender);
        if (room != null) {
            if (sender != null) {
                // Cache it for the future.
                this.sharedRooms.addRoom(room);
            }
            return room;
        }
        console.error("Can't handle room event message", event);
        debugger;
        return null;
    }
    async createNewRoomFromLocalAsset(slide) {
        // Create a new custom room from an asset
        if (slide == null) {
            return null;
        }
        var asset = slide.asset;
        if (asset == null) {
            return null;
        }

        var fingerprint = asset.fingerprint;
        var catalogID = slide.catalogueIdentifier;

        var room = this.rooms.find(aRoom => {
            if (IsKindOf(aRoom, CustomRoom) == false) {
                return null;
            }
            if (aRoom.identifier == slide.identifier) {
                return aRoom;
            }
            if (fingerprint != null && aRoom.asset.fingerprint == fingerprint) {
                return aRoom;
            }
            if (catalogID != null && aRoom.catalogueIdentifier == catalogID) {
                return aRoom;
            }
            return null;
        });

        if (room != null) {
            return room;
        }

        var title = slide.title;
        if (title != null) {
            title = title.trim();
        }
        if (title == null || title.length == 0) {
            title = LocalizedString("Custom room");
        }
        asset = slide.asset;

        var model = new CustomRoom.Model(createUUID(), this.localPresenterID);
        model.catalogueIdentifier = catalogID;
        model.title = title;
        room = new CustomRoom(slide.asset, model, slide.thumbnailAsset);

        try {
            room = await this.addCustomRoomToCloudy(room);
        }
        catch (err) {
            console.error("addCustomRoomToCloudy returned error: ", room, err);
            throw err;
        }

        return room;
    }
    async importExternalAccountRoom(room) {
        if (this.doesRoomRequireImport(room) == false) {
            return room;
        }

        const fingerprint = room.asset?.fingerprint;
        if (fingerprint != null) {
            const local = this.customRooms.roomWithFingerprint(fingerprint);
            if (local != null) {
                return local;
            }
        }

        let imports = this._roomImports;
        if (imports == null) {
            imports = {};
            this._roomImports = imports;
        }

        let task = imports[room.identifier];
        if (task != null) {
            return task;
        }

        const data = room.toJSON();
        data.id = createUUID();

        const model = data.model;
        if (model != null) {
            model.id = data.id;
            model.presenterID = this.localPresenterID;
        }

        const local = this.roomForEvent(data);
        task = this.addCustomRoomToCloudy(local, false);
        imports[room.identifier] = task;
        // Normally we would clear the task when it finishes
        // but because a remote person could select their
        // custom room again, we'd like it to resolve to
        // the same room we've already imported
        return task;
    }
    /*
     * Custom/cloudy rooms
     */
    _addModifiedListenerForCustomRoom(room) {
        NotificationCenter.default.addObserver(
            CustomRoom.Notifications.Modified,
            room.model,
            this.customRoomModified,
            this
        );
    }
    _destroyCustomRoom(room) {
        NotificationCenter.default.removeObserver(
            CustomRoom.Notifications.Modified,
            room.model,
            this.customRoomModified,
            this
        );
        room.destroy();
    }
    /**
     * A slide or presentation import may create new custom rooms
     * on the service and return the corresponding cloudy records.
     * If we don't already know about these rooms, we need to add them
     * to our list of custom rooms.
     * @param {CloudyRecord[]} record
     * @param {mmhmmAPI} endpoint
     */
    addCustomRoomsFromImport(records, endpoint) {
        records.forEach(record => this.addCustomRoomFromImport(record, endpoint));
    }
    addCustomRoomFromImport(record, endpoint) {
        const id = record.id;
        const existing = this.roomWithIdentifier(id);
        if (existing != null) {
            return;
        }
        const room = this.newCustomRoomFromServerRoom(record, endpoint);
        if (room == null) {
            console.error("Failed to make custom room from newly imported room", id);
            return;
        }
        this.addRoom(room);
        console.log("Added new custom room from import", id);
    }
    newCustomRoomFromServerRoom(room, endpoint) {
        var props = room.properties;
        if (props == null) {
            props = {};
        }

        // Studio creates custom room records for
        // catalog rooms that are "on your list".
        // We ignore these - we already have them
        // from the catalog, and we don't have a
        // concept of "on your list".
        var catalogID = props.catalogueIdentifier;
        if (catalogID != null) {
            return;
        }

        room = CustomRoom.FromCloudy(room, endpoint);
        if (room == null) {
            return null;
        }
        if (room.thumbnailAsset == null) {
            var observer = (obj, key, val) => {
                room.removeObserverForProperty(observer, "thumbnailAsset");
                this.customRoomModified(null, null, obj);
            }
            room.addObserverForProperty(observer, "thumbnailAsset");
        }
        this._addModifiedListenerForCustomRoom(room);
        return room;
    }
    newCustomRoomFromCatalogEntry(entry, title, roomID) {
        if (title == null) {
            title = entry.title;
        }
        if (roomID == null) {
            roomID = entry.id;
        }

        var type = entry.backgroundType;

        if (type == "color") {
            var backgroundColor = entry.backgroundColor;
            if (backgroundColor == null) {
                return null;
            }
            var components = backgroundColor.match(/([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})/i);
            if (components != null && components.length == 4) {
                var color = `#${components[1]}${components[2]}${components[3]}`;
                return new SolidColorRoom(roomID, title, null, color)
            }
            return null;
        }
        else if (type != "file") {
            //console.info("unsupported room catalog type: ", type);
            return;
        }

        var backgroundFile = entry.backgroundFile;
        if (backgroundFile == null) {
            console.info("no backgroundFile on room catalog entry: ", entry);
            return null;
        }
        var backgroundMediaUrl = backgroundFile.backgroundMediaUrl;
        if (backgroundMediaUrl == null) {
            console.info("no backgroundMediaUrl on room catalog entry: ", entry);
            return null;
        }

        var asset = this.createCatalogAssetFromURL(entry, backgroundMediaUrl, false);
        if (asset == null) {
            console.error("Failed to make asset for backgroundMediaUrl", backgroundMediaUrl);
            return null;
        }

        var model = new CustomRoom.Model(roomID, this.localPresenterID);
        model.title = title;
        model.catalogueIdentifier = entry.id;

        var thumbnailUrl = entry.thumbnailUrl;
        var thumbnailAsset = null;
        if (thumbnailUrl != null) {
            thumbnailAsset = this.createCatalogAssetFromURL(entry, thumbnailUrl, true);
        }
        else {
            console.error("No thumbnailUrl for catalog room", entry);
        }

        var room = new CustomRoom(asset, model, thumbnailAsset);
        if (entry.searchTerms != null) {
            room.searchTerms = entry.searchTerms;
        }
        return room;
    }
    createCatalogAssetFromURL(room, assetURL, isThumbnail) {
        var url = new URL(assetURL);
        var asset = null;
        if (url.searchParams.get("X-Amz-Expires") != null) {
            asset = new RoomCatalogAsset(room, assetURL, isThumbnail);
        }
        else {
            asset = new LocalAsset({contentURL: assetURL});
        }
        return asset;
    }
    processCustomRoomUpdate(record, endpoint) {
        // Check to see if we initiated this record change
        var updatedRecords = this.updatedCustomRoomRecords;
        if (updatedRecords != null) {
            var recordUpdatedAt = new Date(record.updatedAt).getTime();

            var match = updatedRecords.find(entry => {
                // Can't compare entry <-> record as the data
                // differs between what the endpoint returns and
                // what the websocket returns.
                // e.g. `createdAt` exists in the endpoint response
                // but not in the websocket response...
                if (entry.id != record.id) {
                    return false;
                }

                // Have experienced the date format not being identical
                // between records returned via endpoint and websocket
                // e.g.:
                // endpoint record:  updatedAt: "2023-01-12T18:08:49.36Z"
                // websocket record: updatedAt: "2023-01-12T18:08:49.360Z"
                // So we *must* construct date objects and compare time
                // to play it safe.
                var entryUpdatedAt = new Date(entry.updatedAt).getTime();
                if (entryUpdatedAt != recordUpdatedAt) {
                    return false;
                }
                return true;
            });

            if (match != null) {
                // Yes, we initiated this record change,
                // so we'll ignore this websocket update.
                var index = updatedRecords.indexOf(match);
                updatedRecords.splice(index, 1);
                return;
            }
        }

        var roomID = record.id;
        var category = this.customRooms;
        var room = category.roomWithIdentifier(roomID);

        var roomWasDeleted = (
            (record.deleted == true) ||
            (record.decodeProperty("trashed", Boolean) == true)
        );

        if (roomWasDeleted == true) {
            if (room != null) {
                category.removeRoom(room);
                this._destroyCustomRoom(room);
            }
            return;
        }

        if (room != null) {
            var model = room.model;
            if (model != null) {
                model.decodeUsingCloudyRecord(record);
            }
            return;
        }

        var assetReferences = record.assetReferences;
        if (assetReferences != null && assetReferences.length > 0) {
            var first = assetReferences[0];
            if (first.uploaded == false) {
                // We'll wait for this to be uploaded from the other
                // client before we show it in the list...
                return;
            }
        }

        // XXX: combine with the logic below which this was copied from
        room = this.newCustomRoomFromServerRoom(record, endpoint);
        if (room == null) {
            return;
        }
        this.addRoom(room, false);
    }
    async processCustomRooms(serverRooms, endpoint) {
        serverRooms.forEach(room => {
            var createdAt = room.createdAt;
            if (createdAt != null) {
                var date = new Date(createdAt);
                if (date != null) {
                    room.created = date.getTime();
                    return;
                }
            }
            room.created = 0;
        })
        serverRooms = serverRooms.sort((a, b) => {
            var createdA = a.created;
            var createdB = b.created;
            if (createdA < createdB) {
                return -1;
            }
            else if (createdA > createdB) {
                return 1;
            }
            return 0;
        })
        var category = this.customRooms;
        var localRooms = category.rooms;

        var serverRoomWithID = function(roomID) {
            return serverRooms.find(room => room.id == roomID);
        }
        var localRoomWithID = function(roomID) {
            return localRooms.find(room => room.identifier == roomID);
        }

        var added = serverRooms.filter(room => localRoomWithID(room.id) == null);
        var removed = localRooms.filter(room => serverRoomWithID(room.identifier) == null);
        var existing = localRooms.filter(room => serverRoomWithID(room.identifier) != null);

        removed.forEach(room => {
            category.removeRoom(room);
            this._destroyCustomRoom(room);
        });

        added.forEach(room => {
            var customRoom = this.newCustomRoomFromServerRoom(room, endpoint);
            if (customRoom == null) {
                //console.log("failed to make custom room from server room", room)
                return;
            }
            this.addRoom(customRoom, false);
        })

        existing.forEach(room => {
            var record = serverRooms.find(record => record.id == room.identifier);
            if (record == null) {
                return;
            }

            var model = room.model;
            if (model != null) {
                model.decodeUsingCloudyRecord(record);
            }
        })
    }
    async reloadCustomRooms(ep) {
        let task = this._loadingCustomRoomsTask;
        if (task != null) {
            return task;
        }

        task = ep.retrieveCustomRooms().then(rooms => {
            if (rooms == null) {
                return;
            }
            // CloudyRecord omits asset references when encoding to JSON,
            // but we need them stored, so we pre-process
            var roomsJSON = rooms.map(room => room.toLocalJSON());
            this.cacheStore.setCustomRooms(roomsJSON);
            this.processCustomRooms(rooms, ep);
        }).catch(err => {
            console.error("Error reloading custom rooms", err);
        }).finally(() => {
            this._loadingCustomRoomsTask = null;
        });
        this._loadingCustomRoomsTask = task;
        return task;
    }
    async addCustomRoomToCloudy(room, showProgressDialog=true) {
        var sheet = null;
        var removeUnloadHandler = null;
        var cancelController = new AbortController();

        if (room.catalogueIdentifier == null) {
            var beforeUnloadHandler = (evt) => {
                evt.returnValue = LocalizedString("Are you sure you want to leave the page? The upload is still in progress");
            };
            window.addEventListener("beforeunload", beforeUnloadHandler);

            removeUnloadHandler = () => {
                if (beforeUnloadHandler != null) {
                    window.removeEventListener("beforeunload", beforeUnloadHandler);
                    beforeUnloadHandler = null;
                }
            }

            if (showProgressDialog == true) {
                var title = LocalizedString("New Wallpaper");
                var message = LocalizedString("Uploading file…");

                sheet = new ProgressSheet(title, false);
                sheet.messageLabel.innerText = message;
                sheet.addButton(LocalizedString("Cancel"), "secondary", evt => {
                    sheet.dismiss();
                    cancelController.abort();
                    removeUnloadHandler();
                })
                sheet.displayAsModal();
            }
        }

        var endpoint = mmhmmAPI.defaultEndpoint();
        return new Promise((resolve, reject) => {
            endpoint.addCustomRoom(room, cancelController.signal, (progress) => {
                if (sheet != null) {
                    sheet.progressIndicator.value = progress * 100;
                }
            }).then(serverRoom => {
                if (sheet != null) {
                    sheet.dismiss();
                }

                if (cancelController.signal.aborted == true) {
                    resolve(null);
                    endpoint.deleteCustomRoom(room);
                    return;
                }

                var newRoom = this.newCustomRoomFromServerRoom(serverRoom, endpoint);
                resolve(newRoom);
                if (newRoom != null) {
                    this.addRoom(newRoom);
                }
            }).catch(err => {
                if (sheet != null) {
                    sheet.dismiss();
                }

                if (cancelController.signal.aborted != true) {
                    console.error("endpoint.addCustomRoom returned error", err);
                    var errorMessage = err.toString();
                    ShowAlertView(
                        LocalizedString("Upload error"),
                        LocalizedStringFormat("An unknown error occurred while uploading the room: ${errorMessage}", {errorMessage})
                    );
                }
                reject(err);
            }).finally(() => {
                if (removeUnloadHandler != null) {
                    removeUnloadHandler();
                }
            });
        })
    }
    undeleteCustomRoom(room) {
        if (room.presenterID != null) {
            room.hidden = false;
            return;
        }

        var customRooms = this.customRooms;
        if (customRooms.containsRoom(room) == true) {
            console.error("CustomRooms already contains room?", customRooms, room);
            return;
        }

        var endpoint = mmhmmAPI.defaultEndpoint();
        endpoint.undeleteCustomRoom(room).then(() => {
            // Try to keep cache up to date...
            customRooms.addRoom(room);
        }).catch(err => {
            console.error("Error undeleting room: ", room, err);
            customRooms.removeRoom(room);
        })
    }
    deleteCustomRoom(room) {
        if (room.presenterID != null) {
            room.hidden = true;
            return;
        }

        var customRooms = this.customRooms;
        if (customRooms.containsRoom(room) == false) {
            console.error("CustomRooms doesn't contain room?", customRooms, room);
            return;
        }

        this.removeRoomFromRecents(room);

        if (room == this.stage.room) {
            // We deleted the room that's on stage, choose from our recents
            // to replace it
            var rooms = this.recentRooms ?? [];
            var newRoomToSelect = rooms.find(anotherRoom => anotherRoom != room);
            if (newRoomToSelect == null) {
                newRoomToSelect = this.defaultRoom;
            }

            this.stage.room = newRoomToSelect;
        }

        customRooms.removeRoom(room);
        this._destroyCustomRoom(room);

        var endpoint = mmhmmAPI.defaultEndpoint();
        endpoint.deleteCustomRoom(room).then(() => {
            // Try to keep cache up to date...
        }).catch(err => {
            if (err == "An item with the specified identifier could not be found") {
                return;
            }
            console.error("Error deleting room: ", room, err);
            customRooms.addRoom(room);
        })
    }
    customRoomModified(userInfo, notificationName, object) {
        var ep = mmhmmAPI.defaultEndpoint();
        var room = null;
        if (IsKindOf(object, CustomRoom) == true) {
            room = object;
        }
        else if (IsKindOf(object, CustomRoom.Model) == true) {
            room = this.customRooms.rooms.find(room => room.model == object);
        }
        if (room == null) {
            console.error("Couldn't determine which room posted notification", userInfo, notificationName, object);
            return;
        }

        if (ep.user.id != room.model.presenterID) {
            return;
        }

        var roomsNeedingUpdate = this.roomsNeedingUpdate;
        if (roomsNeedingUpdate == null) {
            roomsNeedingUpdate = [];
            this.roomsNeedingUpdate = roomsNeedingUpdate;
        }

        if (roomsNeedingUpdate.indexOf(room) == -1) {
            roomsNeedingUpdate.push(room);
        }

        var updateTimeout = this.customRoomUpdateTimeout;
        if (updateTimeout != null) {
            window.clearTimeout(updateTimeout);
        }

        updateTimeout = window.setTimeout(() => {
            this.customRoomUpdateTimeout = null;
            this.processRoomsNeedingUpdate();
        }, 1000);

        this.customRoomUpdateTimeout = updateTimeout;
    }
    processRoomsNeedingUpdate() {
        var ep = mmhmmAPI.defaultEndpoint();
        var roomsNeedingUpdate = this.roomsNeedingUpdate;
        while (roomsNeedingUpdate.length > 0) {
            var room = roomsNeedingUpdate.shift();
            ep.updateCustomRoom(room).then(record => {
                // We'll store the record here, and if the websocket
                // notifies us about the record, we'll ignore the
                // message and remove it from the list...
                var updatedRecords = this.updatedCustomRoomRecords;
                if (updatedRecords == null) {
                    updatedRecords = [];
                    this.updatedCustomRoomRecords = updatedRecords;
                }
                updatedRecords.push(record);

                // If the websocket isn't functioning properly, updatedRecords
                // would endlessly grow.  Wait 10 seconds to be nice, and
                // prune the record if it still exists then
                window.setTimeout(() => {
                    var index = updatedRecords.indexOf(record);
                    if (index != -1) {
                        updatedRecords.splice(index, 1);
                    }
                }, 10000)
            });
        }
    }
    roomCatalogAssetExpired() {
        this.cacheStore.setRoomCatalog(null);

        var ep = mmhmmAPI.defaultEndpoint();
        if (ep.isAuthenticated == true) {
            this.reloadRoomCatalog(ep);
        }
    }
    authenticationChanged() {
        var ep = mmhmmAPI.defaultEndpoint();
        if (ep.isAuthenticated == true) {
            this.reloadCustomRooms(ep);
            this.reloadRoomCatalog(ep);
            return;
        }

        this.cacheStore.setRoomCatalog(null);
        this.cacheStore.setCustomRooms(null);

        var customRooms = this.customRooms;
        customRooms.rooms = [];

        var stage = this.stage;
        if (stage != null) {
            var allRooms = this.rooms;
            if (allRooms.indexOf(stage.room) == -1) {
                stage.room = allRooms[0];
            }
        }

        var teamsCategory = this.teamsCategory;
        if (teamsCategory != null) {
            this.removeCategory(teamsCategory);
            this.teamsCategory = null;
        }
    }
    get stage() {
        return gApp.stage; // XXX
    }
    get localPresenterID() {
        var localPresenter = gApp.localPresenter; // XXX
        return localPresenter.identifier;
    }
    /*
     * Room catalog
     */
    async reloadRoomCatalog(endpoint) {
        if (this.loadingRoomCatalog == true) {
            return;
        }

        this.loadingRoomCatalog = true;

        let catalog = null;
        try {
            catalog = await endpoint.retrieveRoomCatalog();
        } catch (err) {
            console.error("Error reloading room catalog", err);
            return;
        } finally {
            this.loadingRoomCatalog = false;
        }

        // Ensure UUIDs are all lowercase
        if (catalog != null) {
            const tags = catalog.tags ?? [];
            tags.forEach(tag => {
                tag.id = tag.id.toLowerCase();
                tag.rooms = tag.rooms.map(roomID => roomID.toLowerCase());
            });

            const rooms = catalog.rooms ?? [];
            rooms.forEach(room => {
                room.id = room.id.toLowerCase();
            });
        }

        this.cacheStore.setRoomCatalog(catalog);
        this.processCatalogRooms(catalog);
    }
    processCatalogRooms(catalog) {
        var roomsToIgnore = [
                "d79eac38-7e47-43dd-8f66-0d561b009f9e", // Your room
            ];

        // If there is a team rooms category in the catalog, we'll
        // find and reassign it while going through the catalog tags
        this.teamsCategory = null;

        var tags = catalog.tags ?? [];
        var catalogRooms = catalog.rooms ?? [];

        // Create the rooms from the master list, then create the categories and add the rooms
        var roomIDs = new Set(tags.flatMap(tag => tag.rooms));
        catalogRooms = catalogRooms.filter(room => roomIDs.has(room.id));
        var localRooms = [];
        catalogRooms.forEach(catalogRoom => {
            if (roomsToIgnore.includes(catalogRoom.id)) {
                return;
            }

            // See if we already have it
            var existing = this.roomWithIdentifier(catalogRoom.id);
            if (existing != null) {
                // Update it
                var asset = existing.asset;
                if (asset != null && IsKindOf(asset, RoomCatalogAsset) == true) {
                    asset.updateUsingRecord(catalogRoom);
                }
                if (existing.title != catalogRoom.title) {
                    existing.title = catalogRoom.title;
                }
                if (catalogRoom.searchTerms != null) {
                    existing.searchTerms = catalogRoom.searchTerms;
                }
                localRooms.push(existing);
            }
            else {
                var localRoom = this.newCustomRoomFromCatalogEntry(catalogRoom);
                if (localRoom == null) {
                    // This is expected, some rooms aren't supported...
                    return;
                }
                localRooms.push(localRoom);
            }
        });

        // Now add the catalog categories and populate their rooms
        tags.forEach(tag => {
            this.processCatalogTag(tag, localRooms)
        });

        // See if the any categories were removed from the catalog
        var categories = this.categories;
        categories.forEach(category => {
            if (category.catalogIdentifier != null) {
                var catalogTag = tags.find(tag => tag.id == category.catalogIdentifier);
                if (catalogTag == null) {
                    this.removeCategory(category);
                }
            }
        });
    }
    processCatalogTag(tag, rooms) {
        var tagsToIgnore = [
            "60308c46-2433-4bc2-aa7c-0a30ab5dd710", // New, CMS-generated
            "16e254b6-5bb4-442c-b54d-e6544644b908", // New, service-generated
        ];

        if (tagsToIgnore.includes(tag.id) == true) {
            return;
        }

        // See if we already have a category with this ID
        var category = this.categoryWithIdentifier(tag.id);
        if (category == null) {
            var icon = this.makeIconForRoomCategory(tag.iconUrl);
            category = new RoomsCategory(tag.title, icon, tag.id);
            this.addCategory(category);
        }

        // Add the rooms
        var roomIDs = tag.rooms;
        rooms = rooms.filter(room => roomIDs.includes(room.identifier));
        rooms.sort((a, b) => {
            return a.title.localeCompare(b.title);
        });
        rooms.forEach(room => {
            var roomID = room.identifier;
            var existing = category.roomWithIdentifier(roomID);
            if (existing == room) {
                return;
            }
            if (existing != null) {
                category.removeRoom(existing);
            }
            category.addRoom(room);
        });
        category.rooms.forEach(room => {
            // Our cache may have restored a catalog room
            // that no longer exists on the service. So purge those
            // from the category...
            var roomID = room.identifier;
            var record = rooms.find(record => record.identifier == roomID);
            if (record == null && IsKindOf(room, CustomRoom)) {
                category.removeRoom(room);
            }
        })

        // A user may have 0 or 1 team rooms categories
        // If we found one, save it
        if (tag.business == true) {
            this.teamsCategory = category;
        }
    }
    makeIconForRoomCategory(iconUrl) {
        if (gLocalDeployment == true && iconUrl.includes("businesses@2x.png")) {
            // Some CORS issues preventing the tagWithIcon from loading on localhost
            iconUrl = "./assets/businesses@2x.png";
        }
        var icon = document.createElement("div");
        icon.style.maskImage = `url(${iconUrl})`
        icon.style.webkitMaskImage = icon.style.maskImage;
        icon.className = "category-icon mask";
        return icon;
    }
}

RoomsController.Notifications = Object.freeze({
    SharedRoomRetrieved: "SharedRoomRetrieved"
});

RoomsController.MaxNumberOfRecents = 20;
RoomsController.MinNumberOfRecents = 6;

/*
 * Helper functions for dealing with the Sanity CMS that we use to
 * manage and distribute room assets.
 */
RoomsController.CDN = Object.freeze({
    getThumbnailURL: function(cdnID, size = this.defaultSize, extension) {
        if (cdnID.match(/-\d*x\d*$/)) { // regexp matches trailing resolution ex: "-123x456"
            return this.cdnImageURL + cdnID + "." + extension + this.thumbnailQuery;
        }

        return this.cdnImageURL + cdnID + "-" + size + "." + extension + this.thumbnailQuery;
    },
    getContentURL: function(cdnID, size, extension) {
        if (size == null) {
            size = this.defaultSize;
        }
        var contentUrl = null;
        var isVideo = (extension == "mp4" || extension == "mov");
        if (isVideo == true) {
            contentUrl = this.cdnFileURL + this.cdnFileMap[cdnID];
        }
        else {
            contentUrl = this.cdnImageURL + cdnID;
            contentUrl += "-" + size;
        }
        contentUrl += "." + extension;
        if (isVideo == false) {
            contentUrl += this.fullQuery;
        }
        return contentUrl;
    },
    defaultSize: "1920x1080",
    cdnImageURL: "https://cdn.sanity.io/images/abmcou2z/production/",
    cdnFileURL: "https://cdn.sanity.io/files/abmcou2z/production/",
    thumbnailQuery: "?w=510",
    fullQuery: "?w=1920",
    cdnFileMap: {
        "e92b3c18ad9b953ffe22fd5a92087bc1abde1a90": "e92b3c18ad9b953ffe22fd5a92087bc1abde1a90",
        "2aec2ea94b5f8d66cd4d15ef24a73edbb7f10394": "5358299d1212fd39cd0924a07c1fb2e9c4f6ce08",
        "940fdb6c0632143311f8d8ea901731281f0bdebc": "d1999eab394f043fd7f9254813b2a7ef41b0ffd2",
        "dfe1fe8107f0c1473bde59dc50f26604dbb5779b": "51317d367690a6540d391cc4654c82083e6a0e17",
        "7d845e66400bf28e2cfebe03301bccaf937eeaff": "28c95e9758392f8b0c846c34f5524e4900e1b9b3",
        "5e1169bc330b15dad8b0fa6a1d6659729082473e": "c3944f6f214c08e1bb176fc08f1337e6800e4062",
        "11440188f2d065cbd74de363cbca8a85e642aa9a": "56e1cd0dd68ba9e01704b9735711d9484cee115d",
        "bf5b95c9c9648a057f509af44ec7d0da38516e43": "e12de0287251e370eed3da64834bbbc91583067d",
        "b5f32cc704446294fe86353350c794c1f4f36861": "0cf3049715ac791a1b2f95a65be76f06f4ca7f61",
        "d4400a16540ee0404f6cad12ab29e389fe754df5": "04ce388257ba2a952a115ea4dd22c8008e793b88",
        "22be4460dfd082de5c560f3cef6b915489de98c8": "aae6d79e83770645cc65deb8563556670ba2270e",
        "2d877e731928b51f31958b3b2147d51cf0decf3e": "6d4e653490be6f905ed6e901d0637c6eb49c58a6",
        "dc148d6a356faef5c2a64ac9a405fe85296d8e16": "abffd54b9a013f4d801b97c1dd71466109615725",
        "0f94bcb0c77afe49b092fea9fe79b08d812fe8bf": "dcccdc5de1227d91924211bdf92ad5e2b853f931",
        "143b68309972d5a0e1343a582d0900ad565577c5": "96fcf4c204fedd849e75507038646afe842d70d0",
        "530d671f93c6193b289fc73394756a82be3d6d1c": "c43602c19385e28312f6acc154f0752178fe9430",
        "7ec73ecb9129639ca4cb142e537e86bcb8222663": "c47aa18a37da1a8d39eb507dc9ab322a8a02faa8",
        "fc86198b9e51ca44e76b45df4428de957e420401": "16d0baa79762f40ba7db81035d2ebe226986996c",
        "1962a12e627ae9189fa1ef5fa42e753f252eea45": "6998fb59ef591154553f18e78c9f11e2bf89b900",
        "1432117671611c4b2cfed94ea482e264975c0de1": "b7699943f92c997c899bfdcb619ecd4f9557267c",
        "1968b6620a071752b9ff904d6e141ada9719a6bb": "04572eb504722ff83f435b5d0da03a085fd00db0",
        "41b57c7f915b602639707dff7d1962edf0fd4559": "6c9677cf212c2eb2490bd0acd20f940420e1777e",
        "527f94358dc1f06618ae7865e00164b25f6edb5a": "073d58f41241f3a29878097ddfda455978742735",
        "38934f346e6312bf87e9f3903ccd969e5ccb1c87": "2d93eb2c4b204db487cca8494fad0d81bc527840",
        "a72afaba167cb0dd620e6f69735a45d123d47d7f": "933767c199cc881e18f90e63e61d4ceea539af09",
        "2be4116e20e622f29cc150be869d192db27edd05": "1b5667e11514ad78a714e3c28e0a5bdb01e757f0",
        "0a7ace5a1cfd6a0c263c7311f2fe84c4247c26d7": "ed59528cd910a58f6ea20900d2d9e2e3525857dd",
        "b0d7b7cdf8a6247fce5db7bfb0f1c60db8bfc2d1": "f45e8f886237c33db6b62ff42e232a88a554127a",
        "b40ecc48cb2eb35c8cf39faa63b6ffe245384d7b": "f9045d6ffededfa71edd7afcc916eedd51e9aa9e",
        "b8b24786156154baf7adf6c66df62bc9ab45b49c": "81a60818776d9c358f62a2cb86845c9cf9354a41",
        "010bf5f7d63dee34f65b406884a4ac734f161c74": "824d9fad3ed800ab25e1ae8a1bb768447587bf99",
        "32c996a9b42de58c5e3dcdbb7961410c851149b0": "ff621846a36ece7549f539af4d00c39d13c8fcff",
        "d057cd616915e4c60d21e23bdbc773301a66a5b6": "f4eb81b13359ba9cf6ebfa30d6799f7b7f6cc225",
        "3e3d1850e9b8678950dad8b8b6bb941018e3545e": "b2e4be1a44723cdc282fe5af0ad80d04e3e63206",
        "257347c2f4701b2b1c8ad19c2f8a8fe01ffe7228": "a736bcd374d208b7982ecf2b63b1cb2718c07588",
        "f9f55b72c4caa3028dbc9f2e0c99d0dfae98d15f": "363d387a4d955538c19c453a89bd5e21488047fd",
    },
})

RoomsController.shared = new RoomsController();
