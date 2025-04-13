import React from 'react';
import Image from 'next/image';
import styles from '../styles/About.module.css';
import { Title } from '../Components';

const AboutPage = () => {
  const teamMembers = [
    {
      name: 'Tridib Das',
      role: 'Blockchain Developer',
      image: '/images/member1.jpeg',
      description:
        'A passionate blockchain developer with expertise in Solidity, Ethereum, and Web3. Specializes in creating secure smart contracts and decentralized applications.',
      skills: ['Solidity', 'Ethereum', 'Web3.js', 'Smart Contracts', 'MetaMask Integration']
    },
    {
      name: 'Sagnik Ray',
      role: 'Blockchain Developer',
      image: '/images/member2.jpg',
      description:
       'Security expert focused on blockchain and cryptography. Ensures the application meets the highest security standards while maintaining excellent performance.',
      skills: ['Solidity', 'Ethereum', 'Web3.js', 'Smart Contracts', 'MetaMask Integration']
    },
    {
      name: 'Ankit Kumar Dey',
      role: 'Backend Engineer',
      image: '/images/member3.jpg',
      description:
        'Experienced backend engineer specialized in building scalable server architectures. Strong knowledge in API development and database management.',
      skills: ['Node.js', 'Express', 'MongoDB', 'RESTful APIs', 'AWS']
    },
    {
      name: 'Shiven Patro',
      role: 'Front End Developer',
      image: '/images/member4.jpg',
      description:
        'Creative frontend developer with a keen eye for design and user experience. Expert in creating responsive and intuitive user interfaces for web3 applications.',
      skills: ['React', 'Next.js', 'JavaScript', 'CSS/SCSS', 'UI/UX Design']
    },
    {
      name: 'Siddhant Lal',
      role: 'Testing and Maintaining',
      image: '/images/member5.jpg',
      description:
        'DevOps specialist with expertise in blockchain security and application deployment. Manages testing infrastructure, ensures system reliability, and handles continuous deployment processes across various environments.',
      skills: ['DevOps', 'CI/CD', 'Testing', 'Deployment', 'Security', 'Maintenance']
    }
  ];

  return (
    <div className={styles.container}>
      <Title
        heading="About Our Team"
        paragraph="We are a team of passionate developers on a mission to revolutionize secure communication using blockchain technology."
      />

      <div className={styles.missionSection}>
        <h2>Our Mission</h2>
        <p>
          In an increasingly digital world where privacy concerns are paramount, our team is dedicated to developing secure,
          decentralized communication solutions. This chat DApp represents our commitment to creating applications that
          protect user privacy through blockchain technology and encryption, ensuring that conversations remain private,
          secure, and free from central control.
        </p>
      </div>

      <div className={styles.teamSection}>
        <h2>Meet Our Team</h2>
        <div className={styles.teamGrid}>
          {teamMembers.map((member, index) => (
            <div key={index} className={styles.memberCard}>
              <div className={styles.imageContainer}>
                <div className={styles.imagePlaceholder}>
                  {/* Use Next.js <Image> to display the team member's photo */}
                  <Image
                    src={member.image}
                    alt={member.name}
                    layout="fill"
                    objectFit="cover"
                  />
                </div>
              </div>

              <div className={styles.memberInfo}>
                <h3>{member.name}</h3>
                <h4>{member.role}</h4>
                <p>{member.description}</p>

                <div className={styles.skillsContainer}>
                  <h5>Skills</h5>
                  <div className={styles.skills}>
                    {member.skills.map((skill, idx) => (
                      <span key={idx} className={styles.skillTag}>
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className={styles.techSection}>
        <h2>Technologies We Use</h2>
        <div className={styles.techGrid}>
          <div className={styles.techItem}>
            <h3>Frontend</h3>
            <p>React, Next.js, CSS, HTML, Framer Motion</p>
          </div>
          <div className={styles.techItem}>
            <h3>Development</h3>
            <p>Test.js, Hardhat, Agile Methodology</p>
          </div>
          <div className={styles.techItem}>
            <h3>Blockchain</h3>
            <p>Ethereum, Solidity, Web3.js, MetaMask</p>
          </div>
          <div className={styles.techItem}>
            <h3>Security</h3>
            <p>Encryption, Digital Signatures, Secure Key Management</p>
          </div>
          <div className={styles.techItem}>
            <h3>Deployment</h3>
            <p>Git, GitHub, Netlify</p>
          </div>
        </div>
      </div>

      <div className={styles.contactSection}>
        <h2>Get in Touch</h2>
        <p>
          Interested in collaborating or learning more about our project? We'd love to hear from you!
        </p>
        <a href="https://www.linkedin.com/in/ray-sagnik/" target="_blank" rel="noopener noreferrer">
          <button className={styles.contactButton}>Contact Us</button>
        </a>
      </div>
    </div>
  );
};

export default AboutPage;
