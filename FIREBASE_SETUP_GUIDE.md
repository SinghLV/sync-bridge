# 🔥 Firebase Setup Guide (For Garvit)

Hey Garvit! Since you're handling the Firebase setup for the Flutter app, here is a step-by-step, beginner-friendly guide to get everything wired up without any headaches. 

Take it one step at a time!

---

### Phase 1: Create the Project

1. **Go to Firebase:** Open your browser and go to [console.firebase.google.com](https://console.firebase.google.com/). Sign in with your Google account.
2. **Create Project:** Click the giant **"Add Project"** box.
3. **Name It:** Call it something like `sync-bridge-hackathon`.
4. **Google Analytics:** You can disable Google Analytics for now to save time. Click **Create Project**.

### Phase 2: Set up the Database

We are using **Firestore** to sync the SOS packets.

1. **Open Firestore:** On the left sidebar, click **Build** -> **Firestore Database**.
2. **Create It:** Click the **Create database** button.
3. **Test Mode:** *This is important!* Choose **"Start in Test mode"**. This ensures the app can read/write data immediately without dealing with complex security rules during the hackathon. 
4. **Location:** Pick a location close to you (e.g., `us-central` or `asia-south1`) and click **Enable**.

### Phase 3: Connect the Flutter App

Now we connect your cloud database to the mobile code. You'll need the terminal for this.

1. **Install Firebase CLI:** If you haven't already, install the Firebase CLI. Open your terminal and run:
   ```bash
   npm install -g firebase-tools
   ```
2. **Login:** Run `firebase login` and sign in through your browser.
3. **Install FlutterFire CLI:** Run this command to install the Flutter connector:
   ```bash
   dart pub global activate flutterfire_cli
   ```
4. **Configure:** In your terminal, use `cd` to navigate into the `mobile-app` folder of the project. Then run:
   ```bash
   flutterfire configure
   ```
5. **Select Project:** It will show a list of your Firebase projects. Use the arrow keys to select the one you just created (`sync-bridge-hackathon`) and hit Enter. Press Enter again to select android/ios/web.
6. **Done:** This will automatically generate a file called `firebase_options.dart` in your code. The mobile app is now connected!

### Phase 4: Get the Web Keys for the Backend Lead

The web dashboard also needs to connect to the same database. You need to generate the "keys" and give them to your backend teammate.

1. **Go to Settings:** Back in the Firebase Console browser window, click the **Gear Icon** ⚙️ next to "Project Overview" (top left) and click **Project settings**.
2. **Add Web App:** Scroll down to the "Your apps" section. Click the **Web icon ( `</>` )**.
3. **Register:** Name it `SyncBridge Web` and click **Register app**.
4. **Copy the Config:** You will see a block of code that looks like this:
   ```javascript
   const firebaseConfig = {
     apiKey: "AIzaSy...",
     authDomain: "...",
     projectId: "...",
     // ...
   };
   ```
5. **Hand-off:** Copy those keys and send them to your backend lead. They need them to configure the `.env` file on their end.

---
**🎉 That's it! You've successfully built the cloud infrastructure!**
