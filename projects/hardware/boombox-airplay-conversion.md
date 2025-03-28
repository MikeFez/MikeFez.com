---
title: Boombox Airplay Conversion
publishedOn: 2012-06-20
updatedOn:
tags: ['post', 'hardware']
excerpt: Years ago, I purchased a Sony RDH-GTK1i boombox that has a 30-pin Apple connector, USB, RCA and radio functionality. At the time of purchase, I had an iPod which was my main audio device. This is how I converted it to support AirPlay.
---

> [!danger] Note From Future MikeFez
> This was a cool expansion of my boombox at the time, but there's a million ways to improve this now.
>
> My 2 cents? Just buy a goddamn bluetooth speaker.

## Introduction

Years ago, I purchased a [Sony RDH-GTK1i](http://www.amazon.com/Sony-RDH-GTK1i-system-cradle-player/dp/B004TR8SV8/ref=sr_1_46?s=electronics&ie=UTF8&qid=1434815878&sr=1-46&keywords=boombox+lights) boombox that has a 30-pin Apple connector, USB, RCA and radio functionality. At the time of purchase, I had an iPod which was my main audio device. Eventually, my iPod with a 30-pin connector gave way to my iPhone 5S with a lightning connector, and so the only way to play my music was via the headphone jack into the RCA input.

However, my main use for this radio is playing music at parties, and so I'd rather not leave my phone hanging around. My first thought was to use bluetooth, and so I backed a product on Kickstarter called the [Auris](https://www.kickstarter.com/428223606/auris-bluetooth-for-your-dock), which is a device that plugs into a 30-pin dock and outputs bluetooth audio. Unfortunately, the range on the device was spotty and did not provide the mobility I was looking for… so I set off to find the best wireless solution to the problem.

## Requirements

- Boombox that supports RCA input
- Device that can wirelessly output audio. In my case, I wanted an AirPlay receiver, so I used an AirPort Express. A RasberryPi or any other device that can output AirPlay audio would work as well.
- 3.5mm Stereo Headphone To RCA Adapter Cable
- [Apple Extension Cable](http://www.amazon.com/Power-Adapter-Extension-Apple-Macbook/dp/B009OA61UK) (depending on model/device)
- Soldering Skills

## Procedure

I've never had issues with my Sony RDH-GTK1i. It's a great stereo with handles that make it easily portable for it's size, and people love the speakers that light up between red and blue depending on the beat. However, it's age is showing with the 30-pin connector sitting on top.

<div>
  <img src="/images/boombox-airplay-conversion/boombox1.jpg" alt="Boombox Image #1" style="width: 49%; float: left;"/>
  <img src="/images/boombox-airplay-conversion/boombox2.jpg" alt="Boombox Image #2" style="width: 49%; float: right;"/>
</div>

After searching around for a solution that allowed better mobility, I realized that AirPlay may be the best candidate – as long as the phone is within the range of WiFi, the boombox will stream perfectly.

With an [Airport Express](https://www.apple.com/airport-express/), I can tap directly into existing networks that my iPhone is also on, and configure settings via the AirPort utility. Better yet, an Airport Express can also broadcast a WiFi network, so if I'm in an area without WiFi, I can simply connect to the Boombox itself after setting up a WiFi network with the Airport utility on my phone!

<img src="/images/boombox-airplay-conversion/airport.jpg" alt="Boombox Image #1" style="margin-left: auto; margin-right: auto; width: 33%;"/>

My initial solution was ugly – I used [Sugru](https://sugru.com/) to mount the Airport to the back of the boombox connected to an extension cord. Since the extension cord had 3 outlets, I plugged the boombox into it as well, zip tied the cables, and used the extension cord in it's place.

It worked, but it drove me crazy to look at, and so I decided to try to get everything mounted internally instead.

The first step is removing the back of the casing. Underneath, everything is mounted to what looks like plywood, and luckily there was adequate space for any additions I wanted to make. There's two separate boards in there, a logic board and a power supply.

![Inside the Boombox](/images/boombox-airplay-conversion/inside-boombox.jpg)

Now that I had a general idea of the layout in my head, decided to trace the RCA connectors in order to find a good soldering point. My plan was to cut off the RCA end of the 3.5mm headphone to RCA cable, and to solder the RCA end's exposed wire directly to the RCA input, and in the end this was successful. With the 3.5mm end, I simply plugged it into the Airport Express and mounted it in place with Sugru.

The benefit of doing it this way is that the RCA inputs are still accessible and can be used. I'm still waiting for someone to tell me why it's a bad idea to have the Airport directly wired this way, but I ensure that nothing is outputted from the Airport if the RCA input is being used by another device.


<div>
  <img src="/images/boombox-airplay-conversion/rca-cable.jpg" alt="Boombox Image #1" style="width: 49%; float: left;"/>
  <img src="/images/boombox-airplay-conversion/inside-wiring1.jpg" alt="Boombox Image #2" style="width: 49%; float: right;"/>
</div>


<img src="/images/boombox-airplay-conversion/inside-wiring2.jpg" alt="Boombox Image #1" style="margin-left: auto; margin-right: auto; width: 33%;"/>


The next step is to find a way to power the Airport. Luckily, Apple provides extension cords to many of their products, and I happened to have a spare laying around.

I found the point on the boombox's power supply where AC power is supplied from, and followed it to the point where the On/Off power switch is. The reason I did it this way is that if the boombox is powered off, the Airport would also power off opposed to the AirPort always being on when the boombox is plugged in.

After taking measurements of the distance from the Airport's mounting point, I cut the extension cable and soldered it directly to the AC power point after the boombox's On/Off switch.

![Apple Extension Cable](/images/boombox-airplay-conversion/extension-cable.jpg)
![Power Wiring](/images/boombox-airplay-conversion/power-wiring1.jpg)
![Power Wiring Detail](/images/boombox-airplay-conversion/power-wiring2.jpg)
![More Wiring](/images/boombox-airplay-conversion/more-wiring.jpg)

I also wanted to have some sort of wired connection to the Airport in the case that I accidentally shut off WiFi on it, making it inaccessible from my phone.

In order to do this, I grabbed a short ethernet cable and a "female to female ethernet extension", plugged one end of the ethernet cable into the Airport, and the other end into the extension. The last step was to mount the extension so that one end is accessible from the outside of the boombox, so I cut a small hole and, as you may have guessed, hot glued it in place. This way, in case I configured it improperly via WiFi, I can plug the boombox directly into my router and fix the configuration.

The final step was to hot glue all the wires I added in order to prevent any rattling, so I went on a hot gluing spree.

![Ethernet Connection](/images/boombox-airplay-conversion/ethernet1.jpg)
![Outside View](/images/boombox-airplay-conversion/outside-view.jpg)
![Final Assembly](/images/boombox-airplay-conversion/final-assembly.jpg)

## Conclusion

It's been a few years since I've done this mod, and I've had no issues whatsoever with the boombox. Normally it stays connected to my home WiFi, though switching it over to broadcast it's own when I bring it out takes just a couple of minutes, and is easy to do.

The other benefit of using AirPlay is that anyone on the network can connect their iOS device, which the majority of the people I know own. So when at a party, I create an unsecured wireless connection and anyone can connect and play with no issues. And for those with other mobile devices, the wired RCA connection is still an option.