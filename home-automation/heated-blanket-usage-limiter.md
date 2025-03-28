---
title: Heated Blanket Usage Limiter
publishedOn: 2018-12-21
updatedOn:
tags: ['post', 'home-automation']
excerpt: I live in an older house with poor insulation, and I turn my thermostat down to 62 at night. Using Home Assistant and a smart plug, I created an automation to limit how long our heated blanket stays on.
---

## Introduction

I live in an older house with poor insulation, and I turn my thermostat down to 62 at night. My fiancée *hates* me when she firsts dives into the cold bed – hell hath no fury, after all. So to make amends, I purchased a heated blanket which I use to warm up the bed before we jump in. Except, now *I'm* the one frustrated as I'm poked awake in the middle of the night, her complaining she's too hot and myself sweating bullets.

I also have a curious little toddler running around the house, and a few times I've walked into my room to find that the blanket had been turned on at some some point – so of course, Home Assistant is the solution.

Most heated blankets (if not all) here in the US do NOT begin to warm upon receiving power, but rather enter a "Standby" – so plugging this into a smart plug does not do all that much other than allow me to remotely shut OFF the blanket. And I'm fine with that – I understand the dangers of unattended heating devices.

At the same time, I don't want to have to request "Alexa, turn on the heated blanket." every night – I already ask her to turn on a sound machine in our room, and it's 2018 for christ's sake, Alexa should get the hint already!

## The Automation

Here's the idea: We're going to plug the blanket into a Wemo Insight switch and have it turn on and off alongside the sound machine, as that should prevent my daughter from having it start heating during the day AND allow me to continue my quest to be as lazy as possible by only requesting the sound machine be turned on at night.

Since the Wemo Insight (as do many other smart switches) allows me to monitor energy usage, I can also use this to monitor the current state of the blanket (standby vs heating) and have an automation turn off the switch after x amount of time – 1 hour in my case.

But, since the blanket does not resume heating upon being reconnected, we can take it one step further and just have it turn the power back on after a quick delay, having the blanket return to "standby" should we wake up and want to turn it on.

Essentially, the blanket will always be in "standby" mode as long as our sound machine is on, and it will only remain in "heating" mode for 1 hour before reverting back to"standby" mode via a quick off & on of the Wemo switch. This also safeguards us against by daughter being smart enough to enable the Wemo and turning on the heat during the day – worst case scenario, it's only running for an hour.

So what does this all look like? Pretty simple, actually:

```yaml
- alias: '[Heated Blanket] Turn Off After 1 Hour Of Use'
  trigger:
  - platform: numeric_state
    entity_id: switch.heated_blanket
    value_template: >
      {% if state.attributes.current_power_w %}
        {{ state.attributes.current_power_w | int }}
      {% else %}
        {{ 0 | int }}
      {% endif %}
    above: 1
    for:
      hours: 1
  - platform: state
    entity_id: switch.sound_machine
    to: 'off'
  action:
  - service: homeassistant.turn_off
    data:
      entity_id: switch.heated_blanket
  - condition: and
    conditions:
    - condition: state
      entity_id: switch.sound_machine
      state: 'on'
  - delay: '00:00:05'
  - service: homeassistant.turn_on
    data:
      entity_id: switch.heated_blanket

- alias: '[Heated Blanket] Turn On With Sleep Mode'
  trigger:
  - platform: state
    entity_id: switch.sound_machine
    to: 'on'
  action:
  - service: homeassistant.turn_on
    data:
      entity_id: switch.heated_blanket
```


The second automation is self explanatory, it just turns on the heated blanket when the sound machine is.

The first automation is also pretty simple, it's triggered when the sound machine is turned on, but also when the heated blanket's power usage is above 1 watt for 1 hour. The template adds some complexity but as there is no current_power_w attribute when the switch is off, we first check to see if the attribute even exists and we consider it to be 0 if not – otherwise we just watch its actual value.

When triggered, it turns off the heated blanket. If the sound machine is currently on, it waits 5 seconds and then turns the heated_blanket back on – now in a standby state. Otherwise, if the sound machine is off (because the automation was triggered by it turning off), the heated blanket just stays off.

## Future Plans and Opportunities

Now I have the best of both worlds as happy wife is happy life, and also the knowledge that my daughter can't burn down the house!

Thanks for reading.

-Fez