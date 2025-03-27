---
layout: post-layout.njk
title: Home Assistant - Automating Alexa Volume With Home Assistant and Spotify
date: 2018-01-09
tags: ['post', 'home-automation']
---
<!-- Excerpt Start -->
Amazon Alexa is a vital tool in my household now that smart devices have taken hold. An issue I frequently see pop up is scheduling Alexa's volume. Here's how to solve it using Home Assistant and Spotify.
<!-- Excerpt End -->

> **Updated Version Available!**
>
> Automating volume control was simplified with the release of a custom component allowing for Alexa devices to appear as media players, found here: [Home Assistant: Automating Alexa Volume As A Media Player](/home-assistant-automating-alexa-volume-as-a-media-player/). At the creation of this post, "Whisper Mode" was not yet an option (though it still may not be considered good enough for some people). There were also few shortcomings identified such as Spotify losing track of available media player options after a while, and so the updated method should be considered as a more stable way of doing this.

## Introduction

Amazon Alexa is a vital tool in my household now that smart devices have taken hold. There's a myriad of physical and virtual controls that I've integrated into my daily life, and having physical controls for each is unrealistic – as is pulling out my phone every time I want to make a change. Alexa easily became my go-to solution for this problem, and my home now has a variety of them strewn across rooms.

An issue I frequently see pop up – [especially in Alexa & Home Automation subreddits](https://www.google.com/search?q=site%3Areddit.com+schedule+alexa+volume) – is scheduling Alexa's volume. Here's an example of this problem: I decided to play music at volume 9 at 3 PM. Later on, after my daughter is in bed, I decided it's also time for bed myself. I whisper my request – "Alexa, turn off the living room lights."

"OK", screams Alexa at an ear-shattering level, waking the entire neighborhood and setting off car alarms. My daughter begins screaming down the hall and I begin my bleary-eyed walk to her room realizing that not only is this my fault, but that it's something that could be completely avoided had Amazon provided options for "Night Volume Levels".

And so I searched and searched, and found nothing – that is, until I started to automate Spotify.

## Home Assistant & Spotify

I'm not going to get into configuring Home Assistant here, as it's been covered a million times before. Instead, I'll talk specifically about the integration itself. Please note that this requires Spotify Premium.

[Home Assistant Spotify Documentation](https://home-assistant.io/components/media_player.spotify/)

You'll notice in the documentation above that the Spotify media player component can keep track of sources. Pulled from the documentation:

> *"The sources are based on if you have streamed to these devices before in Spotify. If you don't have any sources, then simply stream from your phone to another device in your house, Bluetooth, echo, etc. Once you do the sources will show up in the developer console as a device to cast/stream to. Also know that the devices won't show up in the dev-console as sources unless they are powered on as well."*

So, we can choose specific devices Spotify can connect to, but what can we DO with them? Well, since the Spotify component is of type [media_player](https://home-assistant.io/components/media_player/), we can do the following:

> turn_on, turn_off, toggle, volume_up, volume_down, media_play_pause, media_play, media_pause, media_stop, media_next_track, media_previous_track, clear_playlist

Woot woot! Volume control!

So here's the plan. We're going to set up an automation to trigger at 8AM & 8PM. Once triggered, it will have Spotify select the Alexa device that we want to change the volume of, then actually follow through and set the volume. If that sounds simple, it's because it is! Check out the code below.

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
  - service: media_player.select_source
    data:
      entity_id: media_player.spotify
      source: 'Living Room Alexa'
  - service: media_player.volume_set
    data:
      entity_id: media_player.spotify
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
  - service: media_player.select_source
    data:
      entity_id: media_player.spotify
      source: 'Living Room Alexa'
  - service: media_player.volume_set
    data:
      entity_id: media_player.spotify
      volume_level: '0.20'
```

## Conclusion

While I could simplify this into a single automation by using a template that determines which time caused the trigger and setting the volume accordingly, I figured I'd separate them for a more basic read.

Note that '1.0' seems to be the max volume, and so '0.60' and '0.20' are 60% and 20% respectively.

Hope this helps some of you out 🙂