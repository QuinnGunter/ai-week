# The Feature

We aim for an onboarding experience that has as little friction as possible for users. Part of this is offering the initial app download as a Zip archive, which decompresses to an app bundle. Since installing system extensions is only possible from apps in the Applications folder and Sparkle wants the app to be moved from its download location before being able to update, we then need to get the app bundle into the Applications folder. We could ask users to do that (like Sparkle does), but preferably we'd like users to be able to *just click a button*.

In summary, our solution must be able to (a) move the app on first launch from its original location to the Applications folder and (b) relaunch it from there for (c) all users.

# The Problems

## 1. Gatekeeper Path Randomization

[macOS Sierra][1] introduced a feature called Gatekeeper Path Randomization aka app translocation to prevent certain attack vectors. It essentially forces users to [move app bundles from its download or unarchiving location][2] to allow the running app knowing its real, non-translocated file system location.

This thwarts part (a) of our solution, where we need to know the downloaded app bundle's real file system location as the user sees it, e.g. in the Downloads folder. It wouldn't make much sense to move the app bundle from its randomized file system location, leaving the original file bundle in its download location.

## 2. Quarantine

Gatekeeper decides whether path randomization applies to an app bundle by inspecting its [`com.apple.quarantine`][3] file attribute, which the system attaches to every file arriving from the outside world. Depending on what actions the user takes, the attribute's content is altered, but it always sticks to its file (or folder). If the app bundle is moved not in Finder, but programmatically or in the shell, the quarantine attribute remains unchanged, and thus path randomization still applies.

This renders part (b) of our solution void, since even after moving the app bundle on behalf of the user, we still can't escape app translocation and run directly out of the Applications folder.

While we could try and alter the `com.apple.quarantine` file attribute, the exact implementation details are undocumented and likely to change between system versions. The tried and tested solution is therefore to remove the file attribute entirely.

## 3. Permissions


In addition to System Integrity Protection aka rootless, [macOS makes it generally very hard to escalate privileges in code][4]. However, in order to implement part (c) of our solution we need to ask users without admin privileges for permission to make changes to the Applications folder.

While there is no non-deprecated or brutally unsafe API left that would allow us executing one-shot file system operations with admin privileges, Apple luckily still allows running AppleScript from code which prompts users for authorization when running a shell script `"with administrator privileges"`.

# Bypassing Gatekeeper Path Randomization

We use two mechanisms to retrieve the original, non-translocated app bundle path at runtime.

## 1. Private `SecTranslocate` API

As [documented on the Internet][5], with the introduction of Gatekeeper Path Randomization, new, but private API has surfaced in the Security framework. We use the two private C functions `SecTranslocateIsTranslocatedURL` and `SecTranslocateCreateOriginalPathForURL` to determine app translocation for a given URL and its original URL. Using this private API has the big advantage of delivering accurate results.

This API exists unchanged since macOS Sierra and is therefore unlikely to change or vanish. There are numerous checks in place that safeguard against errors or calling inexistent API. If the private API should ever change its parameters, however, we risk producing a crash (or getting wrong results). It's hard to prevent a crash, but we use an extra layer of security through a crash loop prevention mechanism, that checks in before and out again after calling private API. If an unresolved check-in is found before the call to private API, this mechanism errors out of the code path. This prevents users from crashing repeatedly.

## 2. `MDQuery`


As a fallback when the private API is unavailable, we query Spotlight's metadata store for all app bundles matching our bundle identifier and the exact build version. This is faster than a manual search since `mds` always indexes new and existing files in the background. However, query results might be ambiguous or insufficient, depending on the user's Spotlight configuration, which might exclude certain file system locations or disable Spotlight entirely, and the number of matching app bundles in the search scope. Since it's not impossible to have multiple copies of the same download on disk, we only accept unambiguous results consisting of exactly one matching search result.

# Future Proofness

There is little future proofness. We are actively subverting one of macOS's security mechanisms which goes very much against Apple's ambition to lock down their operating systems as much as possible.

Gatekeeper Path Randomization is much less likely to go away than its private API. `MDQuery` or another type of file search can never be an exact, but only a heuristic solution.

Removing the `com.apple.quarantine` file attribute to bypass app translocation is not supported by Apple and could get blocked in the future.

Should Apple deprecate the programmatic execution of AppleScript, or at least its `"with administrator privileges"` option, macOS 14 introduced new API that allows requesting authorization by calling `NSWorkspace.shared.requestAuthorizationOfType:completionHandler:` with `NSWorkspace.AuthorizationType.replaceFile`. 

# Logging

The app bundle mover logs as much as possible, both info breadcrumbs and errors. Here is a selection of possible log messages.

```sh
// Always occurs when enabled.
2024-08-06 15:53:24:354 [INFO] Starting app bundle mover.

// No action necessary because the app bundle is located in the Applications folder. This should reflect 99.9% of all app runs.
2024-08-06 15:53:27:572 [INFO] App bundle mover cancelled: App bundle is already located in Applications folder.

// User selected option to move the app bundle to the Applications folder or replace an existing app bundle there.
2024-08-06 15:53:26:959 [INFO] App bundle mover selection: Move or replace

// User selected option to launch the existing app bundle in the Applications folder.
2024-08-06 15:55:41:723 [INFO] App bundle mover selection: Launch existing version in Applications folder

// User selected option to cancel the move. The app will not run out of the Applications folder but translocated.
2024-08-06 15:58:24:335 [INFO] App bundle mover selection: Cancel

// User is unauthorized and canceled permissions dialog. App bundle mover will not continue.
2024-08-06 16:13:02:804 [INFO] App bundle mover cancelled: User canceled permissions dialog.

// Crash loop prevention caught a crash in the previous app run. App bundle mover will continue without calling private API.
2024-08-06 15:52:04:096 [ERROR] Open check-in found: CheckIn(date: 0001-01-01 00:00:00 +0000, appVersion: "unknown", osVersion: "unknown")

// MDQuery was unable to produce unambiguous results. App bundle mover will not continue.
2024-08-06 15:52:04:137 [ERROR] Search result is inconclusive with 2 results: [...]
```

# Testing

## Baseline

- Move to `/Applications`
	- As admin user
	- As non-admin user
- Replace in `/Applications`
	- As admin user
	- As non-admin user
- Launch from `/Applications`
	- As admin user
	- As non-admin user

## `MDQuery` Fallback

1. Add a fake crash loop prevention (CLP) check-in to the app's user defaults to bypass calling private `SecTranslocation` API.
	1. The UUID is defined in code and must match exactly.
	2. The content of the innermost dictionary is irrelevant, as long as it consists of at least one key-value pair.

```sh
% defaults write app.mmhmm.hybrid '{Check-In = {7D4D2A43-AE79-4DEF-B17C-E2C60D1034C1 = {foo = bar;};};}'
```

2. Open the quarantined app, agree to move it to the `Applications` folder, and observe the logs.
	1. Expectation: Success!

```sh
2024-08-05 21:33:50:680 [ERROR] Open check-in found: CheckIn(date: 0001-01-01 00:00:00 +0000, appVersion: "unknown", osVersion: "unknown")
```

3. Duplicate the quarantined app, open one of them, agree to move it to the `Applications` folder, and observe the logs and the error alert.
	1. Expectation: Failure!

```sh
2024-08-05 21:29:11:443 [ERROR] Open check-in found: CheckIn(date: 0001-01-01 00:00:00 +0000, appVersion: "unknown", osVersion: "unknown")
2024-08-05 21:29:11:482 [ERROR] Search result is inconclusive with 2 results: [...]
```

4. Remove the fake CLP check-in to stop bypassing private API again.

```sh
% defaults delete app.mmhmm.hybrid Check-In
```

## Failing edge case

1. Move app to Applications folder in a non-admin user session. Authorize the move with admin privileges.
2. Replace app in Applications folder in an admin user session.
3. Observe the error alert.

The check that determines if the effective user can write a file at the target location (rightfully) finds that an admin user can do that and so does not request admin privileges. However, without explicitly granted admin privileges removing the existing app bundle fails due to permission issues, because the owning (non-admin) user differs from the effective (admin) user. This should be fixable by making the writability check more robust, but it is currently not a priority.

[1]: https://developer.apple.com/library/archive/releasenotes/MacOSX/WhatsNewInOSX/Articles/OSXv10.html#//apple_ref/doc/uid/TP40017145-SW4
[2]: https://lapcatsoftware.com/articles/app-translocation.html
[3]: https://eclecticlight.co/2020/10/29/quarantine-and-the-quarantine-flag/
[4]: https://developer.apple.com/forums/thread/708765
[5]: https://lapcatsoftware.com/articles/detect-app-translocation.html
