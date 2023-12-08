# Getting Started
To run the app you'll need to create a `.env` file from the `.env.example` file and fill in the required values.

First run:
```shell
npm run generate:keys
```

Then you'll need Docker installed and run:
```shell
docker-compose up --build
```

The app will be available at `http://localhost:4444`.
To change the port you'll need to update the `docker-compose.yml` file and the `Dockerfile` to match the new port defined in the `.env` file.

NB. SWC is not doing typechecking so you'll need to run `npm run type:watch` in a separate terminal to get typechecking.

# Installing new packages
When you install a new package you'll need to rebuild the image by stopping the container.

# Scripts
Testing with Jest
```shell
npm t
```

Linting with ESLint
```shell
npm run lint
```

Typecheck with TypeScript
```shell
npm run type
```


# Realtime

Overall we should follow as much as possible the PubSub from [Twitch](https://dev.twitch.tv/docs/pubsub/):

For realtime updates we use Redis Pub/Sub pattern in combination with WebSockets.
Each server is responsible of listening to `realtime` channel and broadcasting the messages the clients.
We decide to broadcast or not a message based on the `topics` and each client has a list of topics it's interested in.

The naming of a topic should follow `[resource]:[subresource]:[action]` pattern.
Some examples:
- `channel:update`
- `channel:follow`
- `channel:prediction:lock`

Some `topics` might need Authorization so we need to check the scopes of the user. The scopes will be available in the JWT token provided by the `/auth/ws` endpoint.

The scopes are formatted like: `user:read:chat`

To access it the client should retrieve a JWT token from `/auth/ws` generally speaking the client is already authenticated through a login process and has a session cookie.

To send messages or listen to topics the token will be required.


# Tests

## Unit tests

The goal of unit tests is to be as fast as possible to be able to get a quick feedback loop with TDD.
The heavy modules should be implemented for tests with adapter pattern to be able to implement them easily (cf. repository pattern with in memory implementation)

## Integration tests (e2e)

We use [TestContainer](https://node.testcontainers.org/features/compose/) to run our tests in a docker environment either we want only to have the part of the infra needed for tests for example a DB. 

Or if we want to run e2e tests we run `docker-compose.yml` to run the whole infra.


# Deployment

## Setup
We use fly.io to deploy our app. The configuration is in `fly.toml` file.
Before launching make sure to define all the environment variables with:
```shell
flyctl secrets set SECRET="XYZ"
```
Or directly in the web interface.
Change the `app` name in the `fly.toml` file to match your app name. and SESSION_DOMAIN to match your domain.

For Sentry DSN run this command, this will create a project and add `SENTRY_DSN` to your secrets:
```shell
flyctl ext sentry create 
```

It'll use automatically the `Dockerfile` to build the image and deploy it.

To create the app and deploy in fly.io run:
```shell
fly launch
```

For the following deployments you can run:
```shell
fly deploy
```


## Redis
Fly.io provides Upstash Redis as a service so it's possible to get a Redis replica as close a possible from our containers. Just have a look at the URL provided by Fly.io to check the Redis URL.

To access usage from Upstash console visit: https://console.upstash.com/flyio/redis

For the complete documentation have a look at https://fly.io/docs/reference/redis/



