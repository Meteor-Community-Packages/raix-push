ANDROID GUIDE
=============

## Get started
In order to get started with Android you will have to obtain a __projectNumber__ and an __apiKey__
Bellow is a snippet from the official Android documentaion:


## Creating a Google API project
To create a Google API project:

1. Open the Google Developers Console.
2. If you haven't created an API project yet, click Create Project.
3. Supply a project name and click Create. Once the project has been created, a page appears that displays your project ID and project number. For example, __Project Number__: 670330094152.
4. Copy down your project number. You will use it later on as the GCM sender ID.

## Enabling the GCM Service
To enable the GCM service:

1. In the sidebar on the left, select APIs & auth.
2. In the displayed list of APIs, turn the Google Cloud Messaging for Android toggle to ON.

## Obtaining an API Key
To obtain an API key:

1. In the sidebar on the left, select APIs & auth > Credentials.
2. Under Public API access, click Create new key.
3. In the Create a new key dialog, click Server key.
4. In the resulting configuration dialog, supply your server's IP address. For testing purposes, you can use 0.0.0.0/0.
5. Click Create.
6. In the refreshed page, copy the API key. You will need the API key later on to perform authentication in your application server.

> Note: If you need to rotate the key, click Regenerate key. A new key will be created. If you think the key has been compromised and you want to delete it immediately, click Delete.

Reference [official documentation](http://developer.android.com/google/gcm/gs.html)