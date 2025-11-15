# Real-Time Whiteboard (Firebase)
A collaborative, real-time whiteboard app powered by Firebase. Now updated with local emulator support and improved setup steps.

## Development
- Install dependencies by running `yarn install` on the project root and the `functions/` folder
- Run `yarn emulators` to start the realtime database emulator
- Run `yarn start` to start the app

## About
- Hosted on Firebase Hosting
- Authentication handled through Firebase Authentication
- Uses Firebase Realtime Database for presence tracking, messages, and syncing the whiteboard across clients
- Firebase Cloud Functions checks if a board is empty and deletes data
- Serialized line data is compressed using `lz-string` for 50 - 90% reduction in data stored

Note: Touch input is not synced

https://github.com/user-attachments/assets/7af1f721-a935-4e94-8ecb-c06f06d896e7
