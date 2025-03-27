---
layout: post-layout.njk
title: Home Assistant - Automating Alexa Volume As A Media Player
date: 2018-12-19
tags: ['post', 'home-automation']
---
<!-- Excerpt Start -->
This guide is an update to my previous post on automating Alexa volume. Using a custom component, we can now control Alexa devices directly as media players in Home Assistant, providing a more stable solution.
<!-- Excerpt End -->

> **Latest Version**
>
> This guide is an update to my previous post, [Automating Alexa Volume With Home Assistant and Spotify](/automating-alexa-volume-with-home-assistant-and-spotify/). At the time of the post, "Whisper Mode" was not yet an option (though it still may not be considered good enough for some people). There were also few shortcomings identified such as Spotify losing track of available media player options after a while, and so this update should be considered as a more stable way of doing this.

## Introduction

Amazon Alexa is a vital tool in my household now that smart devices have taken hold. There's a myriad of physical and virtual controls that I've integrated into my daily life, and having physical controls for each is unrealistic – as is pulling out my phone every time I want to make a change. Alexa easily became my go-to solution for this problem, and my home now has a variety of them strewn across rooms.

An issue I frequently see pop up – [especially in Alexa & Home Automation subreddits](https://www.google.com/search?q=site%3Areddit.com+schedule+alexa+volume) – is scheduling Alexa's volume. Here's an example of this problem: I decided to play music at volume 9 at 3 PM. Later on, after my daughter is in bed, I decided it's also time for bed myself. I whisper my request – "Alexa, turn off the living room lights."

"OK", screams Alexa at an ear-shattering level, waking the entire neighborhood and setting off car alarms. My daughter begins screaming down the hall and I begin my bleary-eyed walk to her room realizing that not only is this my fault, but that it's something that could be completely avoided had Amazon provided options for "Night Volume Levels".

And so I searched and searched, and found nothing – that is, until I found a custom component that integrates all Echo devices as media players.

## Home Assistant & Alexa Media Players

I'm not going to get into configuring Home Assistant here, as it's been covered a million times before. Instead, I'll talk specifically about the custom component itself.

[keatontaylor's Echo Devices (Alexa) as Media Player](https://community.home-assistant.io/t/echo-devices-alexa-as-media-player-testers-needed)

The link above contains instructions on how to install it – doing so results in each individual Alexa device registered to the Amazon account of your choosing to appear as a media player entity in Home Assistant.

But what can we DO with them? Well, since the Alexa devices now appear as the type [media_player](https://home-assistant.io/components/media_player/), we can do the following:

> turn_on, turn_off, toggle, volume_up, volume_down, media_play_pause, media_play, media_pause, media_stop, media_next_track, media_previous_track, clear_playlist

Woot woot! Volume control!

So here's the plan. We're going to set up an automation to trigger at 8AM & 8PM. The original method to do this was to have Spotify select the Alexa device that we want to change the volume of, then actually follow through and set the volume. It's now even more simple – we just select an Alexa device itself and send the command directly to it – if that sounds simple, it's because it is! Check out the code below.

## Example Code - 8PM and 8AM Volume Changes

```yaml
#############################################################
# Change Living Room Alexa Volume @ 8AM
#############################################################
- id: alexa_morning_volume_living_room
  alias: 'Alexa Volume [Morning]: Living Room'
  trigger:
  - platform: time
    at: '08:00:00'
  action:
  - service: media_player.volume_set
    data:
      entity_id: media_player.bedroom_alexa
      volume_level: '0.60'

#############################################################
# Change Living Room Alexa Volume @ 8PM
#############################################################
- id: alexa_night_volume_living_room
  alias: 'Alexa Volume [Night]: Living Room'
  trigger:
  - platform: time
    at: '20:00:00'
  action:
  - service: media_player.volume_set
    data:
      entity_id: media_player.bedroom_alexa
      volume_level: '0.20'
```

## Conclusion

While I could simplify this into a single automation by using a template that determines which time caused the trigger and setting the volume accordingly, I figured I'd separate them for a more basic read.

Note that '1.0' seems to be the max volume, and so '0.60' and '0.20' are 60% and 20% respectively.

Hope this helps some of you out 🙂