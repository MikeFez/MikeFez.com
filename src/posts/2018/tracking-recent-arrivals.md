---
layout: post-layout.njk
title: Home Assistant - Tracking Recent Arrivals + Having Alexa Welcome Them
date: 2018-12-19
tags: ['post', 'home-automation']
---
<!-- Excerpt Start -->
I remember walking out of a movie theater in 2008 having just watched *Iron Man*, and thinking "Damn, I need JARVIS in my life". Using Home Assistant and Alexa, I created a system to welcome people by name when they arrive home.
<!-- Excerpt End -->

## Introduction

I remember walking out of a movie theater in 2008 having just watched *Iron Man*, and thinking "Damn, I need JARVIS in my life". For those who haven't seen it, JARVIS is an AI that Tony Stark uses initially to control his home and more, and later is integrated directly into his Iron Man suit.

And so after 10 years of dedicated hard work and research, I've finally done it. Tell those computer scientists to pack it up – my Alexa now greets me by name when I open my door. I'm practically an Avenger.

## Tracking Recent Arrivals

The first thing that is needed in order to greet by name is an understanding of WHO just arrived. For all you single people out there, you have it easy, unless you want to greet burglars by name as well. For the rest of us, we've most likely set up [Device Trackers](https://www.home-assistant.io/components/device_tracker/) for those we care about. I'm not going to get into the configuration of that – I personally use a combination of GPS + nmap scans, but the important thing is to have them configured and working properly by the time you are reading this.

But how do we determine not just who is home, but who recently arrived? We take a look at 2 components of that device tracker state: That the person's current location is home, and that the state changed to home within the past X minutes.

We could just use that logic within an automation itself – just have those 2 requirements sit as the condition portion. But this can become frustrating when you have multiple people to track and also should you be using this logic in multiple automations. So let's move them to template binary sensors, and use an input number to make it easy to configure the number of minutes that we should consider someone recent from the front end, until we find that sweet spot:
{% raw %}
```yaml
input_number:
  consider_recent_arrival_mins:
    name: Consider Recent Arrival Max Mins
    initial: 3
    min: 1
    max: 10
    step: 1

binary_sensor:
  - platform: template
    sensors:
      recent_arrival_erika:
        friendly_name: "Recent Arrival: Erika"
        value_template: >-
          {{ states('sensor.time') and is_state("device_tracker.erikas_iphone", "home") and as_timestamp(now()) - as_timestamp(states.device_tracker.erikas_iphone.last_changed | default(0)) | int <= 60 * (states.input_number.consider_recent_arrival_mins.state | int) }}
      recent_arrival_michael:
        friendly_name: "Recent Arrival: Michael"
        value_template: >-
          {{ states('sensor.time') and is_state("device_tracker.michaels_iphone", "home") and as_timestamp(now()) - as_timestamp(states.device_tracker.michaels_iphone.last_changed | default(0)) | int <= 60 * (states.input_number.consider_recent_arrival_mins.state | int) }}
```
{% endraw %}

Before I break down the template, it's important to know how the template functions. A binary_sensor is only true or false, and so the template should resolve to a simple true/false as well. Also, a template only updates when the items it 'monitors' update. So lets take a look at the two straight forward portions:

- is_state("device_tracker.michaels_iphone", "home")
  - This simply states whether it's true or false that my iPhone is home.
- as_timestamp(now()) – as_timestamp(states.device_tracker.michaels_iphone.last_changed | default(0)) | int <= 60 * (states.input_number.consider_recent_arrival_mins.state | int)
  - This one can be a bit tricky. Basically, we grab the current system timestamp and then subtract from it the timestamp of when my phone last changed state (aka, location). This gives us the number of seconds since the last change.
  - We then take the current number (aka, it's state) from input_number.consider_recent_arrival_mins which we created earlier and multiply that by 60, so we're converting it from minutes to seconds.
  - If the number of seconds since my phone's last change is less than or equal to the number of seconds that we decided we should consider something a recent arrival, then it's TRUE. Otherwise it returns False.

So you would think that those 2 conditions should be enough to determine the binary sensors state, right? That if it's true I'm currently home and it's true that I've been home for less than the maximum amount of seconds I'd consider myself recent for, that this works? WRONG. Because the template is only ran when the state of the items within it change, and here is what would need to change:

- My phone's state – which is no help because this will only change when I arrive home – therefore it will not continue updating whether or not I'm STILL a recent arrival after the fact.
- The input_number we just set up, which is pointless because the plan is to not change it at all once we get the sweet spot – and changing the number just to know if I'm a recent arrival or not just doesn't make sense.

You see, all those fancy timestamp comparisons don't matter because the comparisons don't continuously occur. So how do we fix this?

By adding **states('sensor.time')** to the template. This will always resolve true and so it won't interfere with the template as a whole. And as the state of the time sensor is always changing (*[Time keeps on slipping, slipping, slipping, into the future…](https://youtu.be/c1f7eZ8cHpM?t=30)*), this will ensure that our template is ALWAYS updating.

## Configuring Alexa for Text-To-Speech

Alexa does not integrate that well with HASS by default. I recently stumbled across this thread on their forums where keatontaylor created a custom component which essentially allows Alexa devices to function as any other media_player. While in itself great, it also provides TTS (text-to-speech) capabilities via a new custom service.

Install it here and return when complete: [keatontaylor's Echo Devices (Alexa) as Media Player](https://community.home-assistant.io/t/echo-devices-alexa-as-media-player-testers-needed)

## Creating the Automation

The automation will work as follows:

1. Detect the front door opening
2. Determine if there is at least one recent arrival, and proceed if so
3. Send a custom message to Alexa
   1. Have her say "Good morning/afternoon/evening" depending on the time of day.
   2. If Alexa determines that both Erika AND I are recent arrivals, assume we arrived home together and greet us as a family.
   3. Otherwise, greet us individually.

So what does that look like? This:

{% raw %}
```yaml
automation:
  - alias: "[Jarvis] Door Announcement"
    trigger:
    - platform: state
      entity_id: XXXXXXX  # MOTION/DOOR SENSOR HERE
      to: 'on'
    condition:
      condition: or
      conditions:
        - condition: state
          entity_id: binary_sensor.recent_arrival_erika
          state: 'on'
        - condition: state
          entity_id: binary_sensor.recent_arrival_michael
          state: 'on'
    action:
    - delay: 00:00:03  # Lengthen the delay if you think Alexa is speaking before people are fully through the door
    - service: media_player.alexa_tts
      data_template:
        entity_id: media_player.back_room_alexa
        message: '
          {% if now().strftime("%H")|int < 12 %}
            Good morning,
          {% elif now().strftime("%H")|int < 18 %}
            Good afternoon,
          {% else %}
            Good evening,
          {% endif %}
          {% if is_state("binary_sensor.recent_arrival_erika", "on") and is_state("binary_sensor.recent_arrival_michael", "on")  %}
            Fessenden Family
          {% elif is_state("binary_sensor.recent_arrival_erika", "on") %}
            Erika
          {% elif is_state("binary_sensor.recent_arrival_michael", "on") %}
            Michael
          {% endif %}
          .'
```
{% endraw %}

What does this sound like?

- If Erika and I arrive home after 5PM:
  - "Good Evening, Fessenden Family."
- If Erika arrives home before noon:
  - "Good Morning, Erika."
- If I arrive home between noon and 5PM:
  - "Good Afternoon, Michael."

## Future Plans and Opportunities

Alexa greeting me is cool and all, but what else can we do with it?

1. Consolidate updates and provide them to the relevant user when they arrive home.
   1. Maybe announce what TV shows are on tonight, but user specific regarding what they are interested in.
   2. Determine if the haveibeenpwned has found any new breaches per user.
   3. Have Alexa announce the current zone of the other person, or if they are not in one, when they last departed.
2. If nobody is home and the door opens (or the door opens while the house is armed and there are no recent arrivals), have Alexa say a scary phrase on all available devices.
3. Allow for Alexa to only run commands when a user recently arrived home. For example, only allow someone to disarm the house via Alexa if they recently arrived home – this means that if my phone is sitting in the house while I'm not home (or if I'm just not home at all), someone can't disarm it through an open window.

Comment with any other cool ideas you may have! Thanks for reading.

-Fez