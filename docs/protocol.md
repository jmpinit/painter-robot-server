# Painter Robot Protocol

To start controlling the robot via the server, open a WebSocket connection to port 3001.

## Moving

```
{
    method: 'move',
    params: [{ x, y }, options],
    id: <random id string>
}
```

Feedrate can be set via the "options" argument: `{ feedrate: 15000 }`.

## Spraying Paint

```
{
    method: 'spray',
    params: [{
        color: 'green', // 'blue', 'orange', 'red', 'green', or 'water'
        size: 0.5       // a float between 0 and 1
    }],
    id: <random id string>
}
```

Sending a spray with a size of 0 will shut off the paint completely.
