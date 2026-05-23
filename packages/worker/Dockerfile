FROM nvidia/cuda:12.8.0-devel-ubuntu22.04

ENV DEBIAN_FRONTEND=noninteractive
ENV PYTHONUNBUFFERED=1

RUN apt-get update && apt-get install -y \
    python3.11 python3-pip python3.11-dev \
    ffmpeg git cmake wget curl \
    libboost-all-dev libsuitesparse-dev \
    libfreeimage-dev libgoogle-glog-dev \
    libgflags-dev libglew-dev libcgal-dev \
    build-essential ninja-build \
    && rm -rf /var/lib/apt/lists/*

# COLMAP
RUN git clone https://github.com/colmap/colmap.git /tmp/colmap && \
    cd /tmp/colmap && mkdir build && cd build && \
    cmake .. -GNinja -DCMAKE_CUDA_ARCHITECTURES=native && \
    ninja && ninja install && \
    rm -rf /tmp/colmap

# PyTorch + gsplat
RUN pip3 install torch torchvision --index-url https://download.pytorch.org/whl/cu128 && \
    pip3 install gsplat==1.5.3 supabase ffmpeg-python requests

# Node.js + splat-transform
RUN curl -fsSL https://deb.nodesource.com/setup_20.x | bash - && \
    apt-get install -y nodejs && \
    npm install -g @playcanvas/splat-transform

WORKDIR /app
COPY handler.py .
COPY utils.py .

CMD ["python3", "handler.py"]
