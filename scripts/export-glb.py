"""Export source/Corolla.blend to public/models/corolla.glb.

Run with Blender, not system Python:
  blender -b --python scripts/export-glb.py
"""

import bpy
from pathlib import Path

root = Path(__file__).resolve().parents[1]
blend = root / "source" / "Corolla.blend"
out = root / "public" / "models" / "corolla.glb"
out.parent.mkdir(parents=True, exist_ok=True)

bpy.ops.wm.open_mainfile(filepath=str(blend))

print("OBJECTS")
for obj in bpy.data.objects:
    slots = [slot.material.name if slot.material else "" for slot in obj.material_slots]
    print(f"  {obj.name}: {slots}")

print("MATERIALS")
for mat in bpy.data.materials:
    print(f"  {mat.name}")

bpy.ops.export_scene.gltf(
    filepath=str(out),
    export_format="GLB",
    export_yup=True,
    export_apply=True,
    export_draco_mesh_compression_enable=False,
    use_selection=False,
)
print(f"WROTE {out} ({out.stat().st_size} bytes)")
