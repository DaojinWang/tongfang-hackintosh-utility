import React, { Component } from "react";
import { createHashHistory } from "history";
import { Select, Checkbox, Input, Button } from "antd";

import "../styles/Configure.styl";

import str from "../resource/string";
import config from "../config";
import Plist from "../utils/plist";
import Success from "../icons/Success";

const { Option, OptGroup } = Select;

export default class Configure extends Component {
  barebones = [];

  constructor(props) {
    super(props);

    let smbios = null, smbiosGenerated = null;
    
    try {
      smbios = window.electron.getMacSerial();
      smbiosGenerated = false;
    } catch (err) {
      alert(str('failedToGetSN'));
    }
    if (!smbios) {
      smbios = window.electron.generateMacSerial();
      smbiosGenerated = true;
    }

    this.state = {
      latestDev: "Unknown",
      downloading: false,
      workStatus: str("getLatest"),
      ...smbios,
      laptop: 0,
      airport: false,
      intel: false,
      brcm: false,
      rndis: false,
      support4k: false,
      pm981: false,
      smbiosGenerated,
      success: false,
      percent: 0,
      fixhibernate: 0,
      download_url: navigator.language === 'zh-CN'
        ? config.download_url.buildbot
        : config.download_url.bitbucket
    };

    this.checkVersion();
  }

  componentWillMount() {
    if (this.state.sn === "C02X3088KGYG" || this.state.sn === "C02WM0Q0KGYG") {
      // eslint-disable-next-line
      if (confirm(str('dontUseDefault'))) {
        const smbios = window.electron.generateMacSerial();
        this.setState({
          ...smbios,
          smbiosGenerated: true
        });
      }
    }
  }

  checkVersion() {
    const versionUrl = "https://api.kirainmoe.com/starbeatVersion";
    
    fetch(versionUrl)
      .then(res => res.json())
      .then(data => {
        if (data.build > config.build || window.location.href.indexOf('github') >= 0) {
          alert(str('updateRequired'));
          createHashHistory().push('/update');
        } else {
          this.setState({
            latestDev: data.latestDev
          });
        }
      });
  }

  getModelList() {
    const res = [];
    let index = 0, brand = 0;
    config.supported_machine.forEach((s) => {
      const models = [];
      s.models.forEach((mach) => {
        this.barebones[index] = mach.barebone;
        models.push(
          <Option key={index} value={index}>
            {mach.model}
          </Option>
        );
        index++;
      });
      res.push(
        <OptGroup key={brand++} label={s.brand}>
          {models}
        </OptGroup>
      );
    });
    return res;
  }

  getDownloadSource() {
    const res = [];
    let index = 0;
    res.push(
      <Option key={index++} value={config.download_url.buildbot}>
        Aya BuildBot ({str("recommend")})
      </Option>
    );    
    res.push(
      <Option key={index++} value={config.download_url.bitbucket}>
        BitBucket
      </Option>
    );
    res.push(
      <Option key={index++} value={config.download_url.github}>
        GitHub
      </Option>
    );
    res.push(
      <Option key={index++} value={config.download_url.cloudflare}>
        CloudFlare CDN
      </Option>
    );
    return res;
  }

  getOptions() {
    const opts = [
      { label: str("injectAirport"), value: "airport" },
      { label: str("injectIntelBluetooth"), value: "intel" },
      { label: str("injectBrcmBluetooth"), value: "brcm" },
      { label: str("injectHoRNDIS"), value: "rndis" },
      { label: str("inject4KSupport"), value: "support4k" },
      { label: str("disablePM981"), value: "pm981" },
      { label: str("fixhibernate"), value: "fixhibernate" }
    ];

    return (
      <Checkbox.Group
        options={opts}
        onChange={v => {
          let todo = {};
          opts.forEach(opt => (todo[opt.value] = 0));
          v.forEach(item => (todo[item] = 1));

          if (todo["support4k"]) {
            alert(str("dontCheck4kIfNotRequire"));
          }

          if (
            todo["support4k"] &&
            (this.barebones[this.state.laptop] === "GJ5CN64" ||
              this.barebones[this.state.laptop] === "GI5CN54")
          ) {
            alert(str("requirement4k"));
          }

          this.setState({
            ...this.state,
            ...todo
          });
        }}
      />
    );
  }

  setOpt(key, value) {
    const state = {
      ...this.state
    };
    state[key] = value;
    this.setState(state);
  }

  getSMBIOSInfo() {
    return (
      <div className="smbios-input">
        <div>
          <label>{str("smbiosModel")}</label>
          <Input
            onChange={v => this.setOpt("model", v.target.value)}
            defaultValue={this.state.model}
          />
        </div>
        <div>
          <label>{str("smbiosSN")}</label>
          <Input onChange={v => this.setOpt("sn", v.target.value)} defaultValue={this.state.sn} />
        </div>
        <div>
          <label>{str("smbiosMLB")}</label>
          <Input onChange={v => this.setOpt("mlb", v.target.value)} defaultValue={this.state.mlb} />
        </div>
        <div>
          <label>{str("smbiosSmUUID")}</label>
          <Input
            onChange={v => this.setOpt("smuuid", v.target.value)}
            defaultValue={this.state.smuuid}
          />
        </div>
      </div>
    );
  }

  updatePercent(percent) {
    this.setState({
      percent
    });
  }

  showChooseGuide() {
    alert(str('chooseGuide'));
  }

  downloadLatest() {
    if (navigator.language === 'zh-CN') {
      alert(str('license'));
    }

    this.setState({
      ...this.state,
      workStatus: str("downloadWait"),
      downloading: true
    });

    const savePath = window.electron.getUserDir() + "/Desktop/Tongfang_EFI";
    try {
      window.electron.rmdir(savePath);
    } catch (e) {}
    window.electron.mkdir(savePath);
    const saveFile = savePath + "/OpenCore.zip";

    try {
      window.electron.downloadFile(this.state.download_url, saveFile, () => {
        try {
          window.electron.unzip(saveFile, savePath + "/OpenCore");

          const fs = window.electron.fs();
          window.electron.rmdir(`${savePath}/BOOT`);

          let extractPath;
          fs.readdirSync(`${savePath}/OpenCore`).forEach(path => {
            if (path.indexOf("ayamita") >= 0 || path.indexOf("hasee-tongfang-macos") >= 0)
              extractPath = path;
          });

          window.electron.rmdir(`${savePath}/BOOT`);
          fs.renameSync(`${savePath}/OpenCore/${extractPath}/BOOT`, `${savePath}/BOOT`);
          window.electron.rmdir(`${savePath}/OC`);
          fs.renameSync(`${savePath}/OpenCore/${extractPath}/OC`, `${savePath}/OC`);
          fs.renameSync(`${savePath}/OpenCore/${extractPath}/Docs/Credits.md`, `${savePath}/OC/Credits.md`);
          window.electron.rmdir(`${savePath}/OpenCore`);

          const content = window.electron.readFile(savePath + "/OC/config.plist");
          const plist = new Plist(content);
          window.p = plist;

          const ACPIdir = `${savePath}/OC/ACPI`;
          switch (this.barebones[this.state.laptop]) {
            case "GK5CN5X":
            case "GK5CN6X":
            case "GK7CN6S":
            default:
              fs.unlinkSync(ACPIdir + "/SSDT-UIAC-GJ5CN64.aml");
              fs.unlinkSync(ACPIdir + "/SSDT-UIAC-GI5CN54.aml");
              fs.unlinkSync(ACPIdir + "/SSDT-UIAC-GK7CP6R.aml");
              fs.unlinkSync(ACPIdir + "/SSDT-UIAC-GK5CP6X.aml");
              fs.unlinkSync(ACPIdir + "/SSDT-UIAC-GK5CN6Z.aml");
              break;
            case "GK5CN6Z":
              fs.unlinkSync(ACPIdir + "/SSDT-UIAC-GK7CP6R.aml");
              fs.unlinkSync(ACPIdir + "/SSDT-UIAC-GK5CP6X.aml");
              fs.unlinkSync(ACPIdir + "/SSDT-UIAC-GI5CN54.aml");
              fs.unlinkSync(ACPIdir + "/SSDT-UIAC-GJ5CN64.aml");
              fs.unlinkSync(ACPIdir + "/SSDT-UIAC.aml");
              fs.renameSync(ACPIdir + "/SSDT-UIAC-GK5CN6Z.aml", ACPIdir + "/SSDT-UIAC.aml");              break;
            case "GJ5CN64":
              fs.unlinkSync(ACPIdir + "/SSDT-UIAC-GK7CP6R.aml");
              fs.unlinkSync(ACPIdir + "/SSDT-UIAC-GK5CP6X.aml");
              fs.unlinkSync(ACPIdir + "/SSDT-UIAC-GK5CN6Z.aml");
              fs.unlinkSync(ACPIdir + "/SSDT-UIAC-GI5CN54.aml");
              fs.unlinkSync(ACPIdir + "/SSDT-UIAC.aml");
              fs.renameSync(ACPIdir + "/SSDT-UIAC-GJ5CN64.aml", ACPIdir + "/SSDT-UIAC.aml");
              plist.setKext("VoodooPS2", false);
              plist.setKext("VoodooI2C", false);
              plist.setKext("VoodooGPIO", false);
              plist.setKext("VoodooPS2Controller_Rehabman", true);
              plist.setSSDT("SSDT-USTP", false);
              break;
            case "GI5CN54":
              fs.unlinkSync(ACPIdir + "/SSDT-UIAC-GJ5CN64.aml");
              fs.unlinkSync(ACPIdir + "/SSDT-UIAC-GK7CP6R.aml");
              fs.unlinkSync(ACPIdir + "/SSDT-UIAC-GK5CP6X.aml");
              fs.unlinkSync(ACPIdir + "/SSDT-UIAC-GK5CN6Z.aml");
              fs.unlinkSync(ACPIdir + "/SSDT-UIAC.aml");
              fs.renameSync(ACPIdir + "/SSDT-UIAC-GI5CN54.aml", ACPIdir + "/SSDT-UIAC.aml");
              plist.setKext("VoodooPS2", false);
              plist.setKext("VoodooI2C", false);
              plist.setKext("VoodooGPIO", false);
              plist.setKext("VoodooPS2Controller_Rehabman", true);
              plist.setSSDT("SSDT-USTP", false);
              break;
            case "GK7CP6R":
            case "GK5CP6V":
            case "GK5CP5V":
            case "GK5CR0V":
              fs.unlinkSync(ACPIdir + "/SSDT-UIAC-GJ5CN64.aml");
              fs.unlinkSync(ACPIdir + "/SSDT-UIAC-GK5CP6X.aml");
              fs.unlinkSync(ACPIdir + "/SSDT-UIAC-GI5CN54.aml");
              fs.unlinkSync(ACPIdir + "/SSDT-UIAC-GK5CN6Z.aml");
              fs.unlinkSync(ACPIdir + "/SSDT-UIAC.aml");
              fs.renameSync(ACPIdir + "/SSDT-UIAC-GK7CP6R.aml", ACPIdir + "/SSDT-UIAC.aml");
              break;
            case "GK5CP6X":
              fs.unlinkSync(ACPIdir + "/SSDT-UIAC-GK7CP6R.aml");
              fs.unlinkSync(ACPIdir + "/SSDT-UIAC-GJ5CN64.aml");
              fs.unlinkSync(ACPIdir + "/SSDT-UIAC-GI5CN54.aml");
              fs.unlinkSync(ACPIdir + "/SSDT-UIAC-GK5CN6Z.aml");
              fs.unlinkSync(ACPIdir + "/SSDT-UIAC.aml");
              fs.renameSync(ACPIdir + "/SSDT-UIAC-GK5CP6X.aml", ACPIdir + "/SSDT-UIAC.aml");
              break;
          }

          if (this.state.airport) {
            plist.setKext("AirportBrcmFixup", true);
            plist.setBootArg("brcmfx-country=CN");
          }
          if (this.state.intel)
            plist.setKext("IntelBluetooth", true);
          if (this.state.brcm) {
            plist.setKext("BrcmBluetoothInjector", true);
            plist.setKext("BrcmFirmwareData", true);
            plist.setKext("BrcmPatchRAM3", true);
          }
          if (this.state.rndis)
            plist.setKext("HoRNDIS", true);
          if (this.state.pm981)
            plist.setSSDT("SSDT-DNVME", true);
          if (this.state.fixhibernate)
            plist.setKext("HibernationFixup", true);
          if (this.state.support4k) {
            plist.setProperties("PciRoot(0x0)/Pci(0x2,0x0)", "AAPL,slot-name", "Built-in");
            plist.setProperties(
              "PciRoot(0x0)/Pci(0x2,0x0)",
              "device_type",
              "Display Controller"
            );
            plist.setProperties(
              "PciRoot(0x0)/Pci(0x2,0x0)",
              "dpcd-max-link-rate",
              new Uint8Array([20, 0, 0, 0])
            );
            plist.setProperties(
              "PciRoot(0x0)/Pci(0x2,0x0)",
              "enable-dpcd-max-link-rate-fix",
              new Uint8Array([1, 0, 0, 0])
            );
            plist.setProperties(
              "PciRoot(0x0)/Pci(0x2,0x0)",
              "framebuffer-con1-alldata",
              new Uint8Array([1, 5, 9, 0, 0, 4, 0, 0, 135, 1, 0, 0])
            );
            plist.setProperties(
              "PciRoot(0x0)/Pci(0x2,0x0)",
              "framebuffer-unifiedmem",
              new Uint8Array([0, 0, 0, 255])
            );
            plist.deleteProperties("PciRoot(0x0)/Pci(0x2,0x0)", "framebuffer-con0-enable");
            plist.deleteProperties("PciRoot(0x0)/Pci(0x2,0x0)", "framebuffer-con0-pipe");
            plist.deleteProperties("PciRoot(0x0)/Pci(0x2,0x0)", "framebuffer-con1-pipe");
            plist.deleteProperties("PciRoot(0x0)/Pci(0x2,0x0)", "framebuffer-con2-enable");            
            plist.deleteProperties("PciRoot(0x0)/Pci(0x2,0x0)", "framebuffer-con2-pipe");
            plist.deleteProperties("PciRoot(0x0)/Pci(0x2,0x0)", "framebuffer-stolenmem");
            plist.deleteProperties("PciRoot(0x0)/Pci(0x2,0x0)", "framebuffer-fbmem");
            plist.setValue(
              "NVRAM/Add/4D1EDE05-38C7-4A6A-9CC6-4BCCA8B38C14/UIScale",
              new Uint8Array([2])
            );
            plist.setBootArg("-cdfon");
          }

          plist.setValue("PlatformInfo/Generic/SystemProductName", this.state.model);
          plist.setValue("PlatformInfo/Generic/SystemSerialNumber", this.state.sn);
          plist.setValue("PlatformInfo/Generic/MLB", this.state.mlb);
          plist.setValue("PlatformInfo/Generic/SystemUUID", this.state.smuuid);

          if (navigator.language !== "zh-CN") {
            plist.setValue(
              "NVRAM/Add/7C436110-AB2A-4BBB-A880-FE41995C9F82/prev-lang:kbd",
              "en-US:0"
            );
          }

          window.electron.writeFile(savePath + "/OC/config.plist", plist.buildPlist());
          fs.unlinkSync(savePath + "/OpenCore.zip");
          this.setState({ downloading: false, success: true });
        } catch (err) {
          alert(str('downloadFailed') + '\n' + err);
        }
      }, (p) => this.updatePercent(p));
    } catch (err) {
      alert(str('downloadFailed') + '\n' + err);
    }
  }

  render() {
    const opencore = require("../resource/opencore.png");

    if (this.state.success)
      return (
        <div className="configure">
          <h3 className="page-title">{str("success")}</h3>
          <div className="configure-success">
            <div className="success-image">
              <Success />
            </div>
            <div className="success-instruction">
              <p>{str("successInfo")}</p>
              <ul>
                <li className="success-item">{str("successInstructionUSB")}</li>
                <li className="success-item">{str("successInstructionHD")}</li>
              </ul>
              <div className="actions">
                <Button
                  type="primary"
                  shape="round"
                  icon="left"
                  onClick={() =>
                    this.setState({
                      workStatus: str("getLatest"),
                      downloading: false,
                      success: false
                    })
                  }
                >
                  {str("backward")}
                </Button>
              </div>
            </div>
          </div>
        </div>
      );
    else
      return (
        <div className="configure">
          <h3 className="page-title">{str("configure")}</h3>
          <p className="page-description">{str("configureDescription")}</p>
          <img className="oc-logo" src={opencore} alt="opencore" />
          <div className="form-container">
            <p>{str("laptopModel")}</p>
            <Select
              showSearch
              placeholder={str("selectModel")}
              optionFilterProp="children"
              defaultValue={config.supported_machine[0].models.length}
              style={{
                width: "100%"
              }}
              onChange={val => this.setState({ ...this.state, laptop: val })}
            >
              {this.getModelList()}
            </Select>

            <p>
              {str("injectOption")} 
              （<a href="javascript:;" onClick={this.showChooseGuide}>{str('whatShouldIChoose')}</a>）
            </p>
            <div className="inject-options">{this.getOptions()}</div>

            <p>
              {str("smbiosInfo")}(
              {this.state.smbiosGenerated
                ? str("getSMBIOSFromGeneration")
                : str("getSMBIOSFromSystem")}
              )
            </p>
            <div className="smbios-info">{this.getSMBIOSInfo()}</div>
            <div className="flex">
              <div className="half">
                <p>{str("downloadSource")}</p>
                <Select
                  showSearch
                  optionFilterProp="children"
                  defaultValue={navigator.language === 'zh-CN' ? config.download_url.buildbot : config.download_url.bitbucket}
                  style={{
                    width: "100%"
                  }}
                  onChange={val => 
                    this.setState({ ...this.state, download_url: val })
                  }
                >
                  {this.getDownloadSource()}
                </Select>
              </div>

              <div className="half">
                <p>{str("versionInfo")}</p>
                <div className="version-info">
                  <p className="version-tag">
                    {str("latestVersion")}: {this.state.latestDev}
                  </p>
                </div>
              </div>
            </div>

            <div className="actions">
              <Button
                type="primary"
                shape="round"
                icon="download"
                loading={this.state.downloading}
                disable={(!this.state.downloading).toString()}
                onClick={() => this.downloadLatest()}
              >
                {this.state.workStatus}
                {this.state.downloading ? " (" + this.state.percent + "%)" : ""}
              </Button>
            </div>
          </div>
        </div>
      );
  }
}
