# FitHive – A Habit-Building Fitness Motivation App

FitHive is a mobile application designed to help users build sustainable healthy habits through daily missions, rewards, community engagement, and smart health tracking. The platform offers personalized goal-based experiences along with a 24×7 AI fitness assistant.

## 🚀 Features

* **Daily Missions & Rewards** – Complete tasks to earn points, badges, and streaks.
* **Health Tracking** – Monitor water intake, sleep, workouts, and period cycle.
* **Goal Personalization** – User inputs (age, weight, height, goal) shape the app experience.
* **Community Feed** – Share posts, images, and fitness journeys with others.
* **AI Fitness Chatbot (24×7)** – NLP-based chatbot for instant fitness and wellness queries.
* **Coach Connect** – Optional 1-to-1 personalized guidance from fitness coaches.

## 🧠 User Benefits

* Encourages consistent habit-building using rewards and streaks.
* Provides instant fitness support via AI chatbot.
* Helps users stay aware of their health patterns.
* Builds motivation through peer interaction and shared progress.

## 🏗️ Architecture Overview

* **Frontend:** React Native (Expo)
* **Backend:** Supabase (Auth, Database, Storage)
* **AI Assistance:** NLP-based fitness chatbot
* **Notifications:** Expo Push Notifications

**Flow Summary:**

1. User authenticates via Supabase Auth.
2. User profile data is stored in Supabase Database.
3. Home screen displays daily missions and health highlights.
4. Users complete tasks to earn rewards and maintain streaks.
5. Community module supports posts and image uploads.
6. Chatbot handles 24×7 user queries.

## 🛠️ Tech Stack

* **Frontend:** React Native (Expo)
* **Backend:** Supabase (Auth, Storage, Postgres DB)
* **AI:** NLP-based fitness chatbot
* **Notifications:** Expo Notifications

## 📱 Core Modules

* User Authentication
* Profile Setup & Personalization
* Daily Habit Tracking
* Rewards & Streak System
* Community Feed
* AI Chatbot
* Coach Connect

## 🎯 Expected Impact

* Improves user motivation through gamified rewards.
* Simplifies health tracking with an all-in-one dashboard.
* Offers instant AI-powered guidance anytime.
* Creates a supportive fitness community.

## 📦 Installation

```bash
git clone https://github.com/Sunn-y103/FitHive.git
cd fithive
npm install
npx expo start
```

Add your Supabase keys to the environment file before running.

## 🤝 Contributing

Contributions, issues, and feature requests are welcome.

