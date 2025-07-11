# Qalc

A simple and powerful calculator that runs purely in the browser and allows custom key mappings and templates (macros).

## Getting started
- **Please only use this on a device with a physical keyboard.**
- Go to https://storchdev.github.io/qalc.
- By default, no keybinds are configured.
- To use the default one-handed preset, gear icon -> one-hand preset.
  - Use the reference below to learn the one-hand preset.
- To make your own custom keybinds, do the above step -> export data -> edit the JSON locally -> import data. A built-in config editor is coming soon.
- A 2-handed keybind setting that doesn't require the use of Shift is probably the fastest/easiest to learn, but I haven't gotten around to making an agreeable preset for it.

## Features
- molar mass function which can take expressions like `H2O`, `Al2(SO4)3`, and automatically disables keybinds upon pressing the `M(` keybind
- intuitive order of operations for exponents, unary minus, and implicit multiplication
- templates (macros) that support custom parameters and can be an expression or JavaScript code

## Default one-hand keybinds reference
![one-hand keybinds](qalc-reference.png)

## Todo
- [ ] pi, trig functions, other?
- [ ] built-in config editor

## Finished todos
- [x] save history to local storage
- [x] import local storage
- [x] add unary -
- [x] implicit multiplication
- [x] expression templates
      
