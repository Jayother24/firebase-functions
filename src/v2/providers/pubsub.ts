import { copyIfPresent } from '../../common/encoding';
import { ManifestEndpoint } from '../../runtime/manifest';
import { CloudEvent, CloudFunction } from '../core';
import * as options from '../options';

/**
 * Google Cloud Pub/Sub is a globally distributed message bus that automatically scales as you need it.
 * You can create a function ({@link onMessagePublished}) that handles Pub/Sub events by using functions.pubsub.
 *
 * This function triggers whenever a new Pub/Sub message is sent to a specific topic.
 * You must specify the Pub/Sub topic name that you want to trigger your function, and set the event within the
 * onPublish() event handler.
 *
 * PubSub Topic:
 * <ul>
 *   <li>A resource that you can publish messages to and then consume those messages via subscriptions.
 *   <li>An isolated data stream for Pub/Sub messages.
 *   <li>Messages are published to a topic.
 *   <li>Messages are listened to via a subscription.
 *   <li>Each subscription listens to the messages published to exactly one topic.
 *
 * Subscriptions - Resource that listens to the messages published by exactly one topic.
 *
 * [More info here](https://firebase.google.com/docs/functions/pubsub-events)
 */

/**
 * Interface representing a Google Cloud Pub/Sub message.
 *
 * @param data - Payload of a Pub/Sub message.
 * @typeParam T - Type representing `Message.data`'s JSON format
 */
export class Message<T> {
  /**
   * Autogenerated ID that uniquely identifies this message.
   */
  readonly messageId: string;

  /**
   * Time the message was published
   */
  readonly publishTime: string;

  /**
   * The data payload of this message object as a base64-encoded string.
   */
  readonly data: string;

  /**
   * User-defined attributes published with the message, if any.
   */
  readonly attributes: { [key: string]: string };

  /**
   * User-defined key used to ensure ordering amongst messages with the same key.
   */
  readonly orderingKey: string;

  /** @hidden */
  private _json: T;

  constructor(data: any) {
    this.messageId = data.messageId;
    this.data = data.data;
    this.attributes = data.attributes || {};
    this.orderingKey = data.orderingKey || '';
    this.publishTime = data.publishTime || new Date().toISOString();
    this._json = data.json;
  }

  /**
   * The JSON data payload of this message object, if any.
   */
  get json(): T {
    if (typeof this._json === 'undefined') {
      try {
        this._json = JSON.parse(
          Buffer.from(this.data, 'base64').toString('utf8')
        );
      } catch (err) {
        throw new Error(
          `Unable to parse Pub/Sub message data as JSON: ${err.message}`
        );
      }
    }

    return this._json;
  }

  /**
   * Returns a JSON-serializable representation of this object.
   *
   * @returns A JSON-serializable representation of this object.
   */
  toJSON(): any {
    const json: Record<string, any> = {
      messageId: this.messageId,
      data: this.data,
      publishTime: this.publishTime,
    };
    if (Object.keys(this.attributes).length) {
      json.attributes = this.attributes;
    }
    if (this.orderingKey) {
      json.orderingKey = this.orderingKey;
    }
    return json;
  }
}

/**
 * The interface published in a Pub/Sub publish subscription.
 * @typeParam T - Type representing `Message.data`'s JSON format
 */
export interface MessagePublishedData<T = any> {
  /**  Google Cloud Pub/Sub message. */
  readonly message: Message<T>;
  /** A subscription resource. */
  readonly subscription: string;
}

/** PubSubOptions extend EventHandlerOptions but must include a topic. */
export interface PubSubOptions extends options.EventHandlerOptions {
  /** The Pub/Sub topic to watch for message events */
  topic: string;
}

/**
 * Handle a message being published to a Pub/Sub topic.
 * @param topic - The Pub/Sub topic to watch for message events.
 * @param handler - runs every time a Cloud Pub/Sub message is published
 * @typeParam T - Type representing `Message.data`'s JSON format
 */
export function onMessagePublished<T = any>(
  topic: string,
  handler: (event: CloudEvent<MessagePublishedData<T>>) => any | Promise<any>
): CloudFunction<CloudEvent<MessagePublishedData<T>>>;

/**
 * Handle a message being published to a Pub/Sub topic.
 * @param options - Option containing information (topic) for event
 * @param handler - runs every time a Cloud Pub/Sub message is published
 * @typeParam T - Type representing `Message.data`'s JSON format
 */
export function onMessagePublished<T = any>(
  options: PubSubOptions,
  handler: (event: CloudEvent<MessagePublishedData<T>>) => any | Promise<any>
): CloudFunction<CloudEvent<MessagePublishedData<T>>>;

/**
 * Handle a message being published to a Pub/Sub topic.
 * @param topicOrOptions - A string representing the PubSub topic or an option (which contains the topic)
 * @param handler - runs every time a Cloud Pub/Sub message is published
 * @typeParam T - Type representing `Message.data`'s JSON format
 */
export function onMessagePublished<T = any>(
  topicOrOptions: string | PubSubOptions,
  handler: (event: CloudEvent<MessagePublishedData<T>>) => any | Promise<any>
): CloudFunction<CloudEvent<MessagePublishedData<T>>> {
  let topic: string;
  let opts: options.EventHandlerOptions;
  if (typeof topicOrOptions === 'string') {
    topic = topicOrOptions;
    opts = {};
  } else {
    topic = topicOrOptions.topic;
    opts = { ...topicOrOptions };
    delete (opts as any).topic;
  }

  const func = (raw: CloudEvent<unknown>) => {
    const messagePublishedData = raw.data as {
      message: unknown;
      subscription: string;
    };
    messagePublishedData.message = new Message(messagePublishedData.message);
    return handler(raw as CloudEvent<MessagePublishedData<T>>);
  };

  func.run = handler;

  Object.defineProperty(func, '__trigger', {
    get: () => {
      const baseOpts = options.optionsToTriggerAnnotations(
        options.getGlobalOptions()
      );
      const specificOpts = options.optionsToTriggerAnnotations(opts);

      return {
        platform: 'gcfv2',
        ...baseOpts,
        ...specificOpts,
        labels: {
          ...baseOpts?.labels,
          ...specificOpts?.labels,
        },
        eventTrigger: {
          eventType: 'google.cloud.pubsub.topic.v1.messagePublished',
          resource: `projects/${process.env.GCLOUD_PROJECT}/topics/${topic}`,
        },
      };
    },
  });

  const baseOpts = options.optionsToEndpoint(options.getGlobalOptions());
  const specificOpts = options.optionsToEndpoint(opts);

  const endpoint: ManifestEndpoint = {
    platform: 'gcfv2',
    ...baseOpts,
    ...specificOpts,
    labels: {
      ...baseOpts?.labels,
      ...specificOpts?.labels,
    },
    eventTrigger: {
      eventType: 'google.cloud.pubsub.topic.v1.messagePublished',
      eventFilters: { topic },
      retry: false,
    },
  };
  copyIfPresent(endpoint.eventTrigger, opts, 'retry', 'retry');
  func.__endpoint = endpoint;

  return func;
}
