import {
  Button,
  Container,
  FormControlLabel,
  Grid,
  Paper,
  Switch,
} from "@material-ui/core";
import { makeStyles } from "@material-ui/core/styles";
import DeleteIcon from "@material-ui/icons/Delete";
import clsx from "clsx";
import React, { useEffect, useRef, useState } from "react";
import CanvasDraw from "react-canvas-draw";
import { useDatabase } from "reactfire";

import { colors, thicknesses } from "./../utils/constants";
import { currentBoard } from "./../utils/firebaseUtils";
import { SliderPicker } from "react-color";
import * as LZString from "lz-string";

const styles = {
  canvas: {
    width: "100%",
    height: "60vh",
  },
  options: {
    marginTop: 16,
    width: "100%",
    backgroundColor: "grey",
  },
  circle: {
    width: 40,
    height: 40,
    borderRadius: "50%",
  },
};

// Add pre-defined colors to styles
Object.keys(colors).forEach((color) => {
  const colorCode = colors[color];
  styles[color] = { backgroundColor: colorCode };
});

const useStyles = makeStyles((theme) => ({ ...styles }));

export default function Canvas() {
  const classes = useStyles();

  // ------------------ State ------------------
  const ref = useRef(null);
  const [brushColor, setColor] = useState(colors.black);
  const [brushThickness, setBrushThickness] = useState(thicknesses[0]);
  const [lazyBrushEnabled, setLazyBrushEnabled] = useState(false);

  // Use a ref for "updated" to persist value across renders
  const updated = useRef(false);

  // ------------------ Firebase ------------------
  const db = useDatabase();
  const linesRef = db.ref(`boards/${currentBoard()}/lines`);

  useEffect(() => {
    linesRef.off();

    linesRef.on("child_added", (snapshot) => {
      if (updated.current === true) {
        updated.current = false;
        return;
      }

      const compressed = snapshot.val();
      const decompressed = LZString.decompressFromUTF16(compressed);
      const newLine = JSON.parse(decompressed);

      if (ref.current) {
        updated.current = false;
        const oldPoints = ref.current.points;

        if (newLine.points) {
          ref.current.drawPoints(newLine);
          ref.current.points = newLine.points;
          ref.current.saveLine({
            brushColor: newLine.brushColor,
            brushRadius: newLine.brushRadius,
          });
        }

        if (oldPoints && oldPoints.length > 0) {
          ref.current.points = oldPoints;
          ref.current.drawPoints({
            points: oldPoints,
            brushColor,
            brushRadius: brushThickness,
          });
        }
      }
    });

    linesRef.on("child_removed", () => {
      if (ref.current) ref.current.clear();
    });
  }, [linesRef, brushColor, brushThickness]);

  // ------------------ Send updates ------------------
  const sendUpdate = () => {
    if (!ref.current) return;
    const parsed = JSON.parse(ref.current.getSaveData());
    if (!parsed.lines || parsed.lines.length === 0) return;
    const latestLine = parsed.lines[parsed.lines.length - 1];
    const compressed = LZString.compressToUTF16(JSON.stringify(latestLine));
    linesRef.push(compressed);
  };

  const sendClear = () => {
    linesRef.set(null);
    if (ref.current) ref.current.clear();
  };

  // ------------------ Ref-dependent effects ------------------
  useEffect(() => {
    if (!ref.current || !ref.current.canvas) return;

    const canvasInterface = ref.current.canvas.interface;
    if (canvasInterface) {
      canvasInterface.onmouseup = () => {
        updated.current = true;
      };
    }

    return () => {
      if (canvasInterface) canvasInterface.onmouseup = null;
    };
  }, []); // run once on mount


  // ------------------ Canvas Component ------------------
  return (
    <>
      <Paper className={classes.canvas} elevation={3}>
        <CanvasDraw
          ref={ref}
          canvasWidth={800}
          canvasHeight={500}
          loadTimeOffset={0}
          immediateLoading={true}
          hideGrid={true}
          lazyRadius={lazyBrushEnabled ? 20 : 0}
          catenaryColor={brushColor}
          brushColor={brushColor}
          brushRadius={brushThickness}
          onChange={() => {
            if (updated.current) {
              sendUpdate();
              updated.current = false;
            }
          }}
        />
      </Paper>

      <Paper className={classes.options} elevation={3}>
        <Container>
          <Grid container spacing={3}>
            {Object.keys(colors).map((color) => (
              <Grid item key={color} xs={1}>
                <div
                  className={clsx(classes.circle, classes[color])}
                  onClick={() => {
                    updated.current = false;
                    setColor(colors[color]);
                  }}
                ></div>
              </Grid>
            ))}
            <Grid item xs={2}>
              <Button
                variant="contained"
                color="default"
                fullWidth
                onClick={() => setColor("white")}
              >
                Eraser
              </Button>
            </Grid>
            <Grid item xs={2}>
              <Button
                variant="contained"
                color="secondary"
                fullWidth
                onClick={sendClear}
                startIcon={<DeleteIcon />}
              >
                Clear
              </Button>
            </Grid>
            <Grid item xs={4}>
              <SliderPicker
                color={brushColor}
                onChangeComplete={(c) => setColor(c.hex)}
              />
            </Grid>
            {thicknesses.map((thickness) => (
              <Grid
                item
                key={thickness}
                xs={1}
                onClick={() => {
                  updated.current = false;
                  setBrushThickness(thickness);
                }}
              >
                <div
                  style={{
                    borderRadius: "50%",
                    height: thickness * 2,
                    width: thickness * 2,
                    backgroundColor: brushColor,
                  }}
                ></div>
              </Grid>
            ))}
            <Grid item xs={2}>
              <FormControlLabel
                control={
                  <Switch
                    checked={lazyBrushEnabled}
                    onChange={() => {
                      updated.current = false;
                      setLazyBrushEnabled(!lazyBrushEnabled);
                    }}
                    name="lazyBrush"
                    color="primary"
                  />
                }
                label="Lazy Brush"
              />
            </Grid>
          </Grid>
        </Container>
      </Paper>
    </>
  );
}
