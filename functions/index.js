// Import function triggers from their respective submodules
const { onRequest } = require("firebase-functions/v2/https");
const { onDocumentCreated, onDocumentDeleted } = require("firebase-functions/v2/firestore");

// Additional imports and initialization
const logger = require("firebase-functions/logger");
const { initializeApp } = require("firebase-admin/app");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");

const admin = require('firebase-admin');
initializeApp();
const db = getFirestore();

// Increments the itemCount for a user when a new grocery item is created.
exports.shoppingappincrementuseritemcount = onDocumentCreated(
  {
    document: "apps/group-todo-list/users/{userId}/todo-items/{itemId}",
    region: "us-west1",
  },
  async (event) => {
    const userId = event.params.userId;
    const itemId = event.params.itemId;

    const userRef = db.doc(`apps/group-todo-list/users/${userId}`);
    const idempotencyRef = db.doc(`idempotencyKeys/${event.id}`);

    try {
      await db.runTransaction(async (transaction) => {
        const idempotencyDoc = await transaction.get(idempotencyRef);
        if (idempotencyDoc.exists) {
          logger.info("shoppingappincrementuseritemcount: User.itemCount already incremented");
          return;
        }

        const userDoc = await transaction.get(userRef);
        if (!userDoc.exists) {
          logger.warn("shoppingappincrementuseritemcount: User not found");
          return;
        }

        const userData = userDoc.data();
        const itemCount = userData.itemCount ? userData.itemCount + 1 : 1;
        transaction.update(userRef, { itemCount });

        transaction.set(idempotencyRef, { processedAt: FieldValue.serverTimestamp() });
      });
      logger.debug("shoppingappincrementuseritemcount: User.itemCount incremented");
    } catch (error) {
      logger.error("shoppingappincrementuseritemcount: Error incrementing User.itemCount", error);
    }
  }
);

// Decrements the itemCount for a user when a new grocery item is deleted
exports.shoppingappdecrementuseritemcount = onDocumentDeleted(
  {
    document: "apps/group-todo-list/users/{userId}/todo-items/{itemId}",
    region: "us-west1",
  },
  async (event) => {
    const userId = event.params.userId;
    const itemId = event.params.itemId;

    const userRef = db.doc(`apps/group-todo-list/users/${userId}`);
    const idempotencyRef = db.doc(`idempotencyKeys/${event.id}`);

    try {
      await db.runTransaction(async (transaction) => {
        const idempotencyDoc = await transaction.get(idempotencyRef);
        if (idempotencyDoc.exists) {
          logger.info("shoppingappdecrementuseritemcount: User.itemCount already decremented");
          return;
        }

        const userDoc = await transaction.get(userRef);
        if (!userDoc.exists) {
          logger.warn("shoppingappdecrementuseritemcount: User not found");
          return;
        }

        const userData = userDoc.data();
        const itemCount = userData.itemCount && userData.itemCount > 0 ? userData.itemCount - 1 : 0;
        transaction.update(userRef, { itemCount });

        transaction.set(idempotencyRef, { processedAt: FieldValue.serverTimestamp() });
      });
      logger.debug("shoppingappdecrementuseritemcount: User.itemCount decremented");
    } catch (error) {
      logger.error("shoppingappdecrementuseritemcount: Error decrementing User.itemCount", error);
    }
  }
);

// Handles redistribution of todo items when a user is deleted
exports.redistributetodoitemsonuserdeletion = onDocumentDeleted(
  {
    document: "apps/group-todo-list/users/{userId}",
    region: "us-west1",
  },
  async (event) => {
    const userId = event.params.userId;
    const userTodoItemsRef = db.collection(`apps/group-todo-list/users/${userId}/todo-items`);
    
    const todoItemsSnapshot = await userTodoItemsRef.get();
    if (todoItemsSnapshot.empty) {
      console.log("No todo items to redistribute.");
      return;
    }
    
    const otherUsersSnapshot = await db.collection('apps/group-todo-list/users')
      .where(admin.firestore.FieldPath.documentId(), '!=', userId)
      .get();
    if (otherUsersSnapshot.empty) {
      console.log("No other users to redistribute the todo items.");
      return;
    }

    const otherUsers = otherUsersSnapshot.docs.map(doc => doc.id);
    if (otherUsers.length === 0) {
      console.log("No valid other users found.");
      return;
    }

    const randomUserIndex = Math.floor(Math.random() * otherUsers.length);
    const targetUserId = otherUsers[randomUserIndex];
    
    todoItemsSnapshot.docs.forEach(async doc => {
      const todoItemData = doc.data();
      await db.collection(`apps/group-todo-list/users/${targetUserId}/todo-items`).add(todoItemData);
      await doc.ref.delete();
    });

    console.log(`Todo items have been redistributed to user ${targetUserId}.`);
  }
);
