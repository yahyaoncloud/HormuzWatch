#!/usr/bin/env python3
"""
Convert generated dataset CSVs to compressed Parquet format and update metadata.
"""
import glob
import json
import os
import sys
import pandas as pd

def convert_datasets(datasets_root: str):
    for d in sorted(glob.glob(os.path.join(datasets_root, "*"))):
        if not os.path.isdir(d):
            continue
        print(f"Processing dataset directory: {d}")
        for split in ["data", "train", "val", "test"]:
            csv_path = os.path.join(d, f"{split}.csv")
            parquet_path = os.path.join(d, f"{split}.parquet")
            if os.path.exists(csv_path):
                df = pd.read_csv(csv_path)
                df.to_parquet(parquet_path, engine="pyarrow", compression="snappy", index=False)
                print(f"  ✓ Exported {parquet_path} ({len(df)} rows, {os.path.getsize(parquet_path)} bytes)")
        
        # Update metadata.json to include parquet files
        meta_path = os.path.join(d, "metadata.json")
        if os.path.exists(meta_path):
            with open(meta_path, "r") as f:
                meta = json.load(f)
            files = meta.get("files", [])
            for p in ["data.parquet", "train.parquet", "val.parquet", "test.parquet"]:
                if p not in files:
                    files.append(p)
            meta["files"] = files
            with open(meta_path, "w") as f:
                json.dump(meta, f, indent=2)
            print(f"  ✓ Updated {meta_path}")

if __name__ == "__main__":
    root = sys.argv[1] if len(sys.argv) > 1 else "/service/ml-service/../../server/datasets"
    convert_datasets(root)
