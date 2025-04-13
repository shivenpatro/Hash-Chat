import React, { useState } from "react";
import Image from "next/image";

// INTERNAL IMPORTS
import Style from "./Model.module.css";
import images from "../../assets";

const Model = ({
  openBox,
  title,
  head,
  info,
  smallInfo,
  image,
  functionName,
  address,
}) => {
  const [name, setName] = useState("");
  const [accountAddress, setAccountAddress] = useState(address);

  return (
    <div className={`${Style.Model} glass-card fade-in`}>
      <div className={Style.Model_box}>
        <div className={Style.Model_box_left}>
          <Image
            src={image}
            alt="Illustration"
            width={700}
            height={700}
            className="scale-in"
          />
        </div>
        <div className={Style.Model_box_right}>
          <h1 className="slide-up">
            {title} <span className="text-gradient">{head}</span>
          </h1>
          <p className="slide-up">{info}</p>
          <div className={`${Style.Model_box_right_name} slide-up`}>
            <div className={Style.Model_box_right_name_info}>
              <Image
                src={images.username}
                alt="User"
                width={30}
                height={30}
              />
              <input
                type="text"
                placeholder={smallInfo}
                onChange={(e) => setName(e.target.value)}
                className="message-input"
              />
            </div>
            <div className={Style.Model_box_right_name_info}>
              <Image
                src={images.account}
                alt="Account"
                width={30}
                height={30}
              />
              <input
                type="text"
                placeholder={accountAddress || "Enter your address"}
                onChange={(e) => setAccountAddress(e.target.value)}
                className="message-input"
              />
            </div>
            <div className={Style.Model_box_right_name_btn}>
              <button
                onClick={() => functionName({ name, accountAddress })}
                className="button-primary"
              >
                <Image src={images.send} alt="Submit" width={30} height={30} />
                Submit
              </button>
              <button
                onClick={() => openBox(false)}
                className="button-primary"
              >
                <Image src={images.close} alt="Cancel" width={30} height={30} />
                Cancel
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Model;
