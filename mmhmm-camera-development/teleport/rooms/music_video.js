//
//  music_video.js
//  mmhmm
//
//  Created by Steve White on 7/30/21.
//  Copyright © 2021 mmhmm, inc. All rights reserved.
//

/*
 * Since this is Airtime Camera, we've removed the audio functionality from rooms
 * The video files aren't in version control and thus are referenced by full URL
 * rather than a path relative to the distribution.
 */

class SpaceRoom extends MediaRoom {
    constructor() {
        super("e3cd27f4-3de8-4392-ba95-42335fffe852", LocalizedString("Space"), "space.jpg",
            "https://app.airtimetools.com/talk/assets/rooms/space.mp4");
    }
}

class CampfireRoom extends MediaRoom {
    constructor() {
        super("776e6241-813a-4ba0-a0f7-e0161369c95c", LocalizedString("Campfire"), "beach_campfire_thumb.jpg",
            "https://app.airtimetools.com/talk/assets/rooms/beach_campfire.mp4");
    }
}

class CabinRoom extends MediaRoom {
    constructor() {
        super("a9be64d6-2b9f-4e5c-a100-aff209be6818", LocalizedString("Cabin"), "fireside_chat.jpg",
            "https://app.airtimetools.com/talk/assets/rooms/fireside_chat.mp4");
    }
}

class OnsenMonkeyRoom extends MediaRoom {
    constructor() {
        super("0973A158-4E08-4D05-A52A-8F002FB013E7", LocalizedString("Monkey Onsen"), "Snow-Monkey-Onsen_thumb.jpg",
            "https://app.airtimetools.com/talk/assets/rooms/Snow-Monkey-Onsen.mp4");
    }
}

class OnsenCoffeeRoom extends MediaRoom {
    constructor() {
        super("A1F938D2-7E4D-40C9-9C0D-673F2E5B4BE3", LocalizedString("Coffee Chat"), "Onsen-Coffee_thumb.jpg",
            "https://app.airtimetools.com/talk/assets/rooms/Onsen-Coffee.mp4");
    }
}
