import { expect, test } from "bun:test"
import {
  type DsnPcb,
  convertDsnPcbToCircuitJson,
  parseDsnToDsnJson,
  stringifyDsnJson,
} from "lib"

// @ts-ignore
import dsnFile from "../assets/repro/smoothieboard-repro.dsn" with {
  type: "text",
}

test("smoothieboard parses and converts without error (issue #54)", () => {
  const dsnJson = parseDsnToDsnJson(dsnFile) as DsnPcb
  const circuitJson = convertDsnPcbToCircuitJson(dsnJson)
  expect(circuitJson.length).toBeGreaterThan(0)

  const platedHoles = circuitJson.filter(
    (e: any) => e.type === "pcb_plated_hole",
  ) as any[]
  expect(platedHoles.length).toBeGreaterThan(0)
})

test("smoothieboard round-trip preserves all padstacks", () => {
  const dsnJson = parseDsnToDsnJson(dsnFile) as DsnPcb
  const originalCount = dsnJson.library.padstacks.length

  const stringified = stringifyDsnJson(dsnJson)
  const reparsed = parseDsnToDsnJson(stringified) as DsnPcb

  // All padstacks preserved by name
  expect(reparsed.library.padstacks.length).toBe(originalCount)

  for (const ps of dsnJson.library.padstacks) {
    const match = reparsed.library.padstacks.find((p) => p.name === ps.name)
    expect(match).toBeDefined()
    expect(match!.shapes.length).toBe(ps.shapes.length)
  }

  // Via padstack preserved
  const viaPs = reparsed.library.padstacks.find(
    (p) => p.name === "Via[0-3]_800:400_um",
  )
  expect(viaPs).toBeDefined()
  expect(viaPs!.shapes.length).toBeGreaterThan(0)
})

test("smoothieboard generates plated holes with correct dimensions via outer/hole diameter naming", () => {
  const dsnJson = parseDsnToDsnJson(dsnFile) as DsnPcb
  const circuitJson = convertDsnPcbToCircuitJson(dsnJson)

  const platedHoles = circuitJson.filter(
    (e: any) => e.type === "pcb_plated_hole",
  ) as any[]

  expect(platedHoles.length).toBeGreaterThan(0)

  for (const hole of platedHoles) {
    if (hole.shape === "circle") {
      expect(hole.hole_diameter).toBeLessThan(hole.outer_diameter)
    } else if (hole.shape === "oval") {
      expect(hole.hole_width).toBeLessThan(hole.outer_width)
      expect(hole.hole_height).toBeLessThan(hole.outer_height)
    }
  }
})
