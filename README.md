# kv-bus

## Introduction

kv-bus is a key - value store implementation with features such as key expiration management, transaction support, and data persistence. It provides a convenient way to manage key - value pairs in a JavaScript environment.

## Features

- Key Expiration: Keys can be set with an expiration time, and expired keys will be automatically cleaned up at regular intervals.
- Transaction Support: Supports atomic operations through the transaction method. If an error occurs during a transaction, the state will be rolled back.
- Data Persistence: Allows data to be persisted to external storage through a custom persistence adapter.
- Automatic Cleanup: Periodically checks and removes expired keys to save memory.
