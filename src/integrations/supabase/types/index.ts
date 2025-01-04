import type { Event, EventInsert, EventUpdate } from './events';
import type { Profile, ProfileInsert, ProfileUpdate } from './profiles';
import type { Recording, RecordingInsert, RecordingUpdate } from './recordings';
import type { NotetakerQueue, NotetakerQueueInsert, NotetakerQueueUpdate } from './notetaker-queue';
import type { Json } from './json';

export type {
  Event,
  EventInsert,
  EventUpdate,
  Profile,
  ProfileInsert,
  ProfileUpdate,
  Recording,
  RecordingInsert,
  RecordingUpdate,
  NotetakerQueue,
  NotetakerQueueInsert,
  NotetakerQueueUpdate,
  Json
};

export type * from './tables';