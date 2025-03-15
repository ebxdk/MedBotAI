{ pkgs }: {
  deps = [
    pkgs.graalvmCEPackages.graalnodejs
    pkgs.iproute2
    pkgs.valkey
    pkgs.nano
    pkgs.cowsay
    pkgs.tesseract
  ];
}