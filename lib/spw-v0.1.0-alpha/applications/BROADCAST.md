# Broadcast@ Application

Version: 0.1.0-alpha
Domain: Signal Transmission

---

## Overview

Broadcast@ interprets Spw seeds as signal flow descriptions. Operators map to broadcast infrastructure; seeds describe routing and transmission.

---

## Operator Bindings

| Operator | Broadcast Element |
|----------|-------------------|
| `!` | Signal source (camera, mic, file) |
| `^` | Channel assignment, bus name |
| `~` | Carrier modulation, processing loop |
| `<>` | Simulcast link, sync coupling |
| `?` | Signal monitor, level check |
| `*` | Source selector, switcher |
| `=` | Technical parameter, standard |
| `@` | Transmission, output |

---

## Modifier Mappings

| Modifier | Broadcast Meaning |
|----------|-------------------|
| `bone` | Normal program |
| `boon` | Primary feed |
| `bane` | Backup feed |
| `bonk` | Alert, EAS |
| `honk` | Breaking news |

---

## Example: Live Broadcast

```spw.b
Broadcast@{
  ^["live_show"]{
    !["camera_1"] | !["camera_2"] | !["graphics"]
    .. *switcher{ @["program"] }    # Source selection
    
    ^["audio"]{
      !["mic_host"] & !["mic_guest"]
      .. =["mix": @levels]
      .. @["program_audio"]
    }
    
    <>["video", "audio"]            # A/V sync
    
    ~["carrier": 474MHz]{
      @["transmitter"]
    }
  }
}
```

---

## Example: Failover

```spw.b
Broadcast@{
  ^["failover"]{
    ?[@primary_healthy]{
      @boon["primary_chain"]
    | !bonk["FAILOVER"]
      @bane["backup_chain"]
      @["alert_noc"]
    }
  }
}
```

---

## Master Control Mapping

| Operator | MCR Element |
|----------|-------------|
| `!` | Sources (cameras, VTRs, feeds) |
| `^` | Patch panels, routers |
| `~` | Processing (frame sync, audio) |
| `?` | Monitoring (scopes, meters) |
| `*` | Switcher, automation |
| `=` | References, standards |
| `@` | Transmitters, encoders |

---

## Use Cases

- Facility documentation
- Signal flow diagrams
- Automation playlists
- Emergency procedures
- Technical specifications
