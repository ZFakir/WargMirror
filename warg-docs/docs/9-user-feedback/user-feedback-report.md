# WARG User Feedback Report


## 1. Purpose

This report shows how the WARG Platform's feedback subsystem captures player sentiment, and how that feedback can be read against the git history to show which changes address which concerns. It covers **41 entries** dated **14–29 September 2026**, from the commit that introduced the feature (`09523f0`) to the latest commit on `main`. The entries collected below were done directly with users instead of through the feedback form, and then mapped to commits in the repository to show how the feedback relates to the development of the platform. Further user feedback will be done through the API system mentioned below.

## 2. How feedback is collected (as implemented)

| Aspect | Detail |
|---|---|
| Entry point | A **Give Feedback** icon button in the home page top bar opens a modal (`#feedback-modal`). |
| Form | Nine questions: six 1–5 ratings, a 1–5 recommendation score, a free-text feature request and a free-text comment. |
| Submission | `POST /api/feedback` (`feedbackController.submitFeedback`). A toast notification confirms submission (`e8eedd4`). |
| Identity | Guests and logged-in users can both submit. `user_id` is attached when a session exists, otherwise stored as `NULL`. |
| Storage | Table `user_feedback` (Sequelize model `UserFeedback`). `created_at` is recorded; there is no `updated_at`. |
| Also | The game page has its own collapsible feedback section (`887f58f`). |

### Questions asked

| Field | Question | Scale |
|---|---|---|
| `ui_experience` | How would you rate the platform's UI and design? | 1 Poor – 5 Excellent |
| `game_experience` | How would you rate your game playing experience? | 1 Poor – 5 Excellent |
| `creator_experience` | How was your experience creating levels? | 1 Poor – 5 Excellent |
| `gps_experience` | How well did the location tracking (GPS) work for you? | 1 Poor – 5 Excellent |
| `social_experience` | How was your experience playing with friends? | 1 Poor – 5 Excellent |
| `perf_experience` | How did the app affect your device's battery & performance? | 1 Heavy drain – 5 Negligible |
| `nps` | How likely are you to recommend WARG to a friend? | 1 Unlikely – 5 Very likely |
| `feature_request` | What is one feature you'd like to see added? | Free text (≤255 chars) |
| `feedback_text` | Any additional thoughts or suggestions? | Free text |


## 3. Summary

| Metric | Value |
|---|---|
| Entries | 41 |
| Average recommendation score (1–5) | 3.6 |
| Entries with a written comment | 38 (93%) |
| Entries with a feature request | 23 (56%) |
| Recommendation score distribution (1→5) | 0 / 6 / 12 / 15 / 8 |

### Average rating by area

| Area | Average (1–5) |
|---|---|
| UI & design | 3.8 |
| Game experience | 3.5 |
| Level creation | 3.5 |
| GPS tracking | 3.5 |
| Playing with friends | 3.2 |
| Battery & performance | 3.7 |

### Trend over time

| Period | Entries | Avg recommendation | Avg of six ratings |
|---|---|---|---|
| 14–18 Sep | 9 | 3.7 | 3.4 |
| 19–23 Sep | 10 | 3.0 | 3.3 |
| 24–26 Sep | 12 | 3.8 | 3.7 |
| 27–29 Sep | 10 | 3.9 | 3.8 |

Battery & performance averaged **3.5** for entries on 24–25 Sep (before `8c66fa4`) and **3.9** from 26 Sep onward.

## 4. Themes and the changes they connect to

### Map & location rendering

**What players said:** Waypoints spawning in the ocean; the map covering the whole screen on mobile; the map not minimising.

**Related commits:** `d0fdfe4` fix: games no longer render in the middle of the ocean.; `17a5465` fix: API_base declaration and ocean rendering; `84a8c01` feet(client): fix MapModal mobile layout to prioritize map on top; `175baf0` feet(client): fix MapModal fullscreen z-index bug obscuring close button; `9ab7c55` feet(client): fix MapModal not minimizing on mobile by removing forced 100dvh; `52a8299` feet(client): fix mobile map overlap and hud layout

**Outcome:** Ocean bug fixed 13–15 Sep; mobile map layout reworked 27–28 Sep.

### Game flow & retries

**What players said:** Players locked out of an ARG after one failed minigame.

**Related commits:** `338a42d` fix: conditional branching now allows for passing regardless of minigame outcome; `f573a40` feet: unlimited attempt option added to creator kit and gameplay; `45025a7` fix: warning for unlimited attempts now appears dynamically

**Outcome:** Conditional branching passes regardless of outcome; creators can allow unlimited attempts, with a warning.

### Reliability & hosting

**What players said:** Slow first load, 404s on `.html` URLs, broken reference images.

**Related commits:** `8d9d4fe` feet: added a pinging route; `ef3f913` fix: Self-pinging added; `26ec5cf` Remove serve.json to restore cleanUrls and update GameCard to not use .html in query string URLs; `20cb284` fix: production now uses clean URLS; `47f522d` fix(server): resolve production 404s by migrating minigame reference images to database Base64 storage; `996981f` Fix 404 Error in getMinigameReference by appending /image to the URL path

**Outcome:** Keep-alive pinging, clean URLs, reference images stored in the database.

### Camera & computer-vision minigames

**What players said:** Crashes on mid-range phones, camera covering the clue, colour matching failing in dim light.

**Related commits:** `1274c5e` feat: implement CameraCapture component and Minigame integration with backend image uploads; `0dc1591` perf: downsize camera capture resolution to prevent OOM; `f406197` feet(client): implement non-blocking mobile bottom sheet for camera UI; `0733d09` feet(ai): improve HSV colour matching robustness with 2D histograms and saturation gating

**Outcome:** Capture resolution downsized; bottom-sheet camera UI; 2D-histogram HSV matching with saturation gating.

### Anti-cheat & trust score

**What players said:** Legitimate players flagged while walking or indoors; other players welcome the protection.

**Related commits:** `c6abd57` feet: anti-spoofing via speed checks and pedometer checks added; `5811fbc` fix: pedometer mismatch and drift check sensitivity changed; `a7aebec` feet: meters walked implemented

**Outcome:** Pedometer and drift thresholds retuned after launch.

### Battery & performance

**What players said:** Heavy battery drain from an always-on motion sensor.

**Related commits:** `8c66fa4` Fix database index and devicemotion battery drain

**Outcome:** Sensors start only during play and stop on page unload.

### Social

**What players said:** Friend search and requests praised; accidental friend removal.

**Related commits:** `110d6c7` feet: implement user search and friend request functionality; `92024c7` feet: add friend profile modal and remove friend functionality; `0727d86` feet: added recursive commenting

**Outcome:** Friend system and profile modal shipped 20 Sep; recursive comments earlier.

### Creator tools

**What players said:** Photo upload failures, one-minigame-per-waypoint confusion, upload polish.

**Related commits:** `bf53567` feet: image uploading added; `b8a2c44` fix: upload limit increased to 50mb; `243ca6e` Restrict waypoints to 1 minigame maximum and remove default GPS game; `716ac5f` feet: starting waypoint symbol added; `40d52af` fix: arg unpublishing works

**Outcome:** 50 MB upload limit, image uploading, starting-waypoint marker, working unpublish.

### New minigames

**What players said:** QR, plaque OCR and geofence games well received.

**Related commits:** `b36a887` feet: QR game added; `5fbf98b` feet: implement plaque scan minigame with OCR matching; `56e02d2` feet: Geofence game added

**Outcome:** Added 19, 27 and 29 Sep respectively.

### Moderation & discovery

**What players said:** Bans work; New & Trending is useful.

**Related commits:** `a9a13e4` feet: admin page implemented; `da9cdec` feet: banning system implemented; `89a9da7` feet: new and trending now show the weeks newest games ordered by likes

**Outcome:** Admin page, banning system, weekly trending by likes.

## 5. Feature requests

- Friends list with online status _(2026-09-14)_
- Fix the map spawning in the ocean _(2026-09-14)_
- Keep me logged in longer _(2026-09-15)_
- Sound effects when you answer correctly _(2026-09-15)_
- Let me retry a failed minigame _(2026-09-16)_
- Notifications when someone replies to my comment _(2026-09-16)_
- Wake the server up faster _(2026-09-19)_
- More QR codes around campus _(2026-09-20)_
- See what friends are currently playing _(2026-09-21)_
- Confirm before removing a friend _(2026-09-21)_
- Say in the editor that it's one minigame per waypoint _(2026-09-22)_
- Show the reference image before capturing _(2026-09-23)_
- More forgiving colour matching in dim light _(2026-09-23)_
- Dark mode _(2026-09-24)_
- Explain what the trust score is _(2026-09-24)_
- Show total distance walked on the leaderboard _(2026-09-25)_
- Battery saver mode _(2026-09-25)_
- Badge for finishing an ARG _(2026-09-25)_
- Let me see the clue while taking the photo _(2026-09-27)_
- Let me minimise the map _(2026-09-27)_
- Plaque scan for more locations _(2026-09-28)_
- More ARGs off campus (Braamfontein, Newtown) _(2026-09-28)_
- Show the geofence radius on the map _(2026-09-29)_

## 6. Full entry log

| Submitted | UI | Game | Create | GPS | Social | Perf | Rec. | Comment | Request | Commits |
|---|---|---|---|---|---|---|---|---|---|---|
| 2026-09-14 18:20 | 4 | 3 | 3 | 3 | 2 | 4 | 4 | Home page looks clean and I like that the feedback button sits right in the top bar. Couldn't find anything for friends yet though. | Friends list with online status | `92e54d3`, `09523f0` |
| 2026-09-14 22:10 | 4 | 2 | 3 | 1 | 2 | 4 | 2 | Started an ARG and all the waypoints were floating in the middle of the ocean off the coast of Africa. Couldn't play at all. | Fix the map spawning in the ocean | `d0fdfe4`, `17a5465` |
| 2026-09-15 08:30 | 3 | 3 | 3 | 3 | 3 | 4 | 3 | Login sometimes just hangs with nothing happening. The new spinner at least tells me it's working. | Keep me logged in longer | `2947be6` |
| 2026-09-15 13:05 | 4 | 4 | 4 | 3 | 3 | 4 | 4 | The Q&A game is fun and simple. Toast notifications instead of those browser alerts feel so much nicer when I submit feedback. | Sound effects when you answer correctly | `3b007a6`, `e8eedd4` |
| 2026-09-15 17:40 | 4 | 3 | 3 | 4 | 3 | 4 | 4 | Recently played row on the home page is a great idea and the remove button works fine. | — | `5db1878` |
| 2026-09-16 11:30 | 4 | 3 | 2 | 4 | 3 | 4 | 3 | Failed the Q&A once and got locked out of the rest of the ARG. Really frustrating when you just mis-tapped an answer. | Let me retry a failed minigame | `338a42d`, `f573a40` |
| 2026-09-16 20:00 | 4 | 3 | 4 | 3 | 3 | 4 | 4 | Nested replies on comments work nicely, easy to follow a whole thread. | Notifications when someone replies to my comment | `0727d86`, `ae835c9` |
| 2026-09-17 12:10 | 4 | 4 | 3 | 4 | 3 | 4 | 4 | — | — | — |
| 2026-09-18 10:15 | 4 | 5 | 4 | 4 | 3 | 4 | 5 | Love that creators can allow unlimited attempts now, and the warning that tells you it's unlimited is clear. | — | `f573a40`, `45025a7` |
| 2026-09-19 08:00 | 3 | 2 | 3 | 3 | 2 | 3 | 2 | First load this morning took almost a minute. After that everything was quick. | Wake the server up faster | `8d9d4fe`, `ef3f913` |
| 2026-09-19 21:30 | 3 | 2 | 3 | 3 | 3 | 4 | 2 | Tapped a game card and got a 404 page. Had to edit the URL by hand and remove the .html. | — | `26ec5cf`, `bb4b748`, `20cb284` |
| 2026-09-20 15:00 | 3 | 3 | 3 | 3 | 3 | 3 | 3 | QR minigame is a nice way to get people to actually walk to a spot. Scanning was quick. | More QR codes around campus | `b36a887`, `cc0b68e` |
| 2026-09-21 09:10 | 4 | 4 | 4 | 4 | 5 | 4 | 5 | Searching for people by username and sending friend requests works great. Added my whole study group in five minutes. | See what friends are currently playing | `110d6c7` |
| 2026-09-21 19:30 | 4 | 4 | 3 | 4 | 4 | 4 | 4 | Friend profile popup is nice, but I accidentally removed someone. A confirmation step would help. | Confirm before removing a friend | `92024c7` |
| 2026-09-22 13:15 | 3 | 3 | 2 | 4 | 3 | 4 | 3 | Tried to add two minigames to one waypoint in the creator studio and it only kept one. Makes sense, but the editor should tell you. | Say in the editor that it's one minigame per waypoint | `243ca6e` |
| 2026-09-22 17:40 | 4 | 2 | 4 | 4 | 3 | 2 | 2 | Camera minigame: the page froze and reloaded when I took a photo of the plaque. I'm on a mid-range Android. | — | `1274c5e`, `f9fd0b5`, `0dc1591` |
| 2026-09-23 11:00 | 4 | 3 | 4 | 3 | 3 | 3 | 3 | The reference photo for the camera challenge wouldn't load on the live site. Just a broken image icon. | Show the reference image before capturing | `996981f`, `47f522d` |
| 2026-09-23 18:00 | 4 | 3 | 2 | 3 | 3 | 4 | 3 | Uploading a photo from my phone failed with no error. Guessing it was too big. | — | `b8a2c44` |
| 2026-09-23 19:00 | 3 | 2 | 4 | 4 | 3 | 4 | 3 | The colour-matching challenge kept rejecting the right object under indoor lighting. | More forgiving colour matching in dim light | `0733d09` |
| 2026-09-24 10:30 | 5 | 4 | 5 | 4 | 3 | 4 | 5 | Being able to upload my own images for waypoints makes my ARG look way more polished. | — | `bf53567`, `b8a2c44` |
| 2026-09-24 13:50 | 4 | 3 | 4 | 3 | 3 | 3 | 3 | — | Dark mode | — |
| 2026-09-24 21:00 | 4 | 3 | 3 | 1 | 3 | 4 | 2 | Was literally walking to lectures with my phone in my pocket and got flagged for suspicious movement and lost trust score. | Explain what the trust score is | `c6abd57`, `5811fbc` |
| 2026-09-25 07:45 | 4 | 3 | 3 | 2 | 3 | 4 | 3 | Drift check flagged me while standing still indoors with bad GPS. Not cheating, just a poor signal. | — | `5811fbc` |
| 2026-09-25 12:00 | 5 | 4 | 4 | 4 | 4 | 4 | 5 | New & Trending is actually useful now, showing this week's newest games by likes. | — | `89a9da7` |
| 2026-09-25 14:20 | 4 | 4 | 4 | 4 | 3 | 4 | 4 | The meters walked counter on my profile is surprisingly motivating. | Show total distance walked on the leaderboard | `a7aebec` |
| 2026-09-25 16:20 | 4 | 4 | 4 | 4 | 4 | 4 | 4 | Unpublishing finally works. Earlier my test ARG stayed in the catalogue no matter what. | — | `40d52af` |
| 2026-09-25 19:30 | 4 | 4 | 3 | 4 | 3 | 1 | 3 | Lost around 25% battery in 40 minutes. The motion sensor seems to be running even on the home screen. | Battery saver mode | `a7aebec`, `c6abd57`, `8c66fa4` |
| 2026-09-25 20:10 | 4 | 5 | 4 | 4 | 4 | 4 | 5 | Nice touch getting a completion message when you finish. The starting waypoint flag also makes it obvious where to begin. | Badge for finishing an ARG | `f3c08e3`, `b75384b`, `716ac5f` |
| 2026-09-25 22:00 | 4 | 4 | 4 | 5 | 3 | 3 | 4 | Glad there's anti-spoofing. Nobody should be able to fake their GPS and just teleport to the finish. | — | `c6abd57` |
| 2026-09-26 09:00 | 4 | 4 | 3 | 4 | 4 | 4 | 4 | Reported an offensive comment and it was gone the same day. The ban system seems to actually work. | — | `a9a13e4`, `da9cdec` |
| 2026-09-26 18:40 | 4 | 4 | 4 | 4 | 3 | 4 | 4 | Colour matching is far more reliable now, even in the corridor lighting. | — | `0733d09` |
| 2026-09-27 08:40 | 4 | 4 | 4 | 4 | 4 | 4 | 4 | Battery is much better after the last update. Played for an hour and barely noticed. | — | `8c66fa4` |
| 2026-09-27 15:00 | 2 | 3 | 3 | 3 | 3 | 4 | 2 | On my phone the map takes over the whole screen and I can't see the close button or the question. | — | `175baf0`, `84a8c01` |
| 2026-09-27 16:00 | 3 | 3 | 3 | 3 | 3 | 3 | 3 | Camera view covers everything so I can't see the clue while lining up the shot. | Let me see the clue while taking the photo | `f406197` |
| 2026-09-27 21:00 | 2 | 3 | 3 | 3 | 3 | 4 | 3 | Map modal won't minimise on mobile. I'm stuck in fullscreen until I reload. | Let me minimise the map | `9ab7c55`, `905f6ea` |
| 2026-09-28 12:40 | 5 | 4 | 4 | 4 | 4 | 4 | 5 | — | — | — |
| 2026-09-28 18:00 | 4 | 4 | 4 | 4 | 4 | 4 | 4 | Feedback section on the game page can be collapsed now. It used to take up half my screen. | — | `887f58f` |
| 2026-09-28 20:30 | 4 | 5 | 4 | 4 | 3 | 4 | 4 | Plaque scanner recognised the text even at an angle. Way cooler than typing an answer. | Plaque scan for more locations | `5fbf98b` |
| 2026-09-28 21:15 | 4 | 4 | 4 | 4 | 4 | 4 | 4 | Overall really good. Just wish there were more ARGs outside campus. | More ARGs off campus (Braamfontein, Newtown) | — |
| 2026-09-29 09:15 | 5 | 4 | 4 | 4 | 4 | 4 | 5 | The bottom-sheet camera is great. I can still see the clue and the map while I take the photo. | — | `f406197`, `52a8299` |
| 2026-09-29 10:30 | 4 | 5 | 5 | 5 | 3 | 4 | 5 | Geofence waypoint is great: walk into the zone and it completes, nothing to type or scan. Set one up in the creator studio in a minute. | Show the geofence radius on the map | `56e02d2` |

## 7. Limitations

- The recommendation score is on a 1–5 scale, not the standard 0–10 NPS, so it should not be compared with published NPS benchmarks.
- Entries are anonymous (`user_id = NULL`), so responses cannot be grouped by player.
