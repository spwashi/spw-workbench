# Hardware@ Application

Version: 0.1.0-alpha
Domain: Electronic Circuits

---

## Overview

Hardware@ interprets Spw seeds as electronic circuit descriptions. Operators map to circuit primitives; seeds describe signal flow.

---

## Operator Bindings

| Operator | Circuit Element |
|----------|-----------------|
| `!` | Voltage/current source |
| `^` | Node label, net name |
| `~` | Oscillator, clock |
| `<>` | Wire bond, connection |
| `?` | Comparator, threshold |
| `*` | Multiplexer, switch |
| `=` | Reference voltage, parameter |
| `@` | Output driver, terminal |

---

## Modifier Mappings

| Modifier | Circuit Meaning |
|----------|-----------------|
| `bone` | Normal operation |
| `boon` | Primary signal path |
| `bane` | Backup/fault path |
| `bonk` | Fault condition |
| `honk` | Priority signal |

---

## Example: Amplifier

```spw.b
Hardware@{
  ^["amplifier"]{
    !["Vin"]                    # Input voltage source
    .. =["gain": 10]            # Fixed gain parameter
    .. ?[@Vin * @gain > @Vmax]{ # Comparator
         =["clamp": @Vmax]      # Voltage limiting
       }
    .. @["Vout"]                # Output terminal
  }
}
```

---

## Example: Oscillator with Feedback

```spw.b
Hardware@{
  ^["vco"]{
    !["control_voltage"]
    .. ~["frequency": @Vctl * 1000]{  # VCO
         <>[@output, @feedback]        # Feedback coupling
       }
    .. @["signal_out"]
  }
}
```

---

## Hardware Kit Mapping

For physical implementation, operators map to module types:

| Operator | Module Type |
|----------|-------------|
| `!` | Signal generators, sensors |
| `^` | Patch bays, terminal strips |
| `~` | Oscillators, timers |
| `<>` | Patch cables, mixers |
| `?` | Comparators, meters |
| `*` | Multiplexers, switches |
| `=` | Voltage references |
| `@` | Output buffers, displays |

---

## Use Cases

- Circuit documentation
- Signal flow diagrams
- Educational electronics
- Hobbyist kit specifications
- Hardware description prototyping
