import { sleep } from "../test-utils/utils";
export const setupUserMock = async (page, options = {}) => {
    await sleep(3000);
    await page.exposeFunction("getTestOptions", _ => options);
    return await page.evaluate(async () => {
        App.isHybrid = false;
        let options = await window.getTestOptions();
        let oldGetItem = window.localStorage.getItem;
       // Override the getItem to get preconfigured value.
        window.localStorage.getItem = (store) => {
            if (store === Statsig.STASIG_OVERRIDE_KEY && options.overrides) {
                return JSON.stringify(options.overrides);
            } else {
                return oldGetItem(store);
            }
        }
        let resolvePromise = mmhmmAPI.defaultEndpoint()._signedInPromise;
        mmhmmAPI.defaultEndpoint =  sinon.fake.returns({ isAuthenticated: true,
            getTrackingParameters: () => {
                return { "experimentId": "" }
            },
            user: {
                id: "userId",
                mmhmmTVAlpha: "false",
                mmhmmTVBeta: "false",
                email: "malkunittest@emtyfp0i.mailosaur.net",
            } });
        window.getReleaseTrack = sinon.fake.returns("development");
        resolvePromise.resolve();
    });
}
